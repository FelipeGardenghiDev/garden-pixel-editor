import type { ToolType, ProjectionMode, Point, Rect, Layer } from './types';
import { PixelDocument } from './document';
import { Viewport } from './viewport';
import { HistoryManager, DrawRectCommand } from './history';
import { PixelBuffer } from './pixel-buffer';
import { hexToUint32, uint32ToHex } from './color';
import { bresenhamLine, drawRectOutline, floodFill, drawIsoCube, deriveIsoShades } from './algorithms';
import { snapToIsometricAxis, snapToOrthoAxis, wrapCoordinate } from './constraints';

export class EditorEngine {
  public document: PixelDocument;
  public viewport: Viewport;
  public history: HistoryManager;
  public isSpacePressed: boolean = false;

  // Editor states
  public currentTool: ToolType = 'pencil';
  public projectionMode: ProjectionMode = 'isometric';
  public primaryColor: string = '#000000';
  public primaryColor32: number = hexToUint32('#000000');
  
  public showPixelGrid: boolean = true;
  public showIsoGrid: boolean = true;
  public isoStepSize: number = 4; // grid spacing for isometric guides

  // Active stroke / tool preview state
  public isDrawing: boolean = false;
  public isPanning: boolean = false;
  private strokeStartPixel: Point = { x: 0, y: 0 };
  private lastStrokePixel: Point = { x: 0, y: 0 };
  public currentHoverPixel: Point | null = null;
  public previewBuffer: PixelBuffer; // Temporary overlay buffer for previewing lines/boxes

  // Tracking modified pixels during stroke for clean undo dirty rects
  private modifiedPixelsMap: Map<number, number> = new Map(); // index -> oldColor
  private dirtyMinX: number = Infinity;
  private dirtyMaxX: number = -Infinity;
  private dirtyMinY: number = Infinity;
  private dirtyMaxY: number = -Infinity;

  // Listeners for UI state reactivity
  private stateListeners: Array<() => void> = [];

  constructor(docWidth: number = 48, docHeight: number = 48) {
    this.document = new PixelDocument(docWidth, docHeight);
    this.viewport = new Viewport();
    this.history = new HistoryManager();
    this.previewBuffer = new PixelBuffer(docWidth, docHeight);

    this.setColor('#FF004D'); // Start with a vibrant retro red

    // Trigger state changes
    this.document.onChange(() => this.notifyState());
    this.viewport.onChange(() => this.notifyState());
    this.history.onChange(() => this.notifyState());
  }

  public onStateChange(listener: () => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  public notifyState(): void {
    for (const listener of this.stateListeners) {
      listener();
    }
  }

  public setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.previewBuffer.clear();
    this.notifyState();
  }

  public setProjectionMode(mode: ProjectionMode): void {
    this.projectionMode = mode;
    this.previewBuffer.clear();
    this.notifyState();
  }

  public setColor(hex: string): void {
    this.primaryColor = hex;
    this.primaryColor32 = hexToUint32(hex);
    this.notifyState();
  }

  public togglePixelGrid(): void {
    this.showPixelGrid = !this.showPixelGrid;
    this.notifyState();
  }

  public toggleIsoGrid(): void {
    this.showIsoGrid = !this.showIsoGrid;
    this.notifyState();
  }

  /**
   * Resets active stroke tracking
   */
  private startStrokeTracking(): void {
    this.modifiedPixelsMap.clear();
    this.dirtyMinX = Infinity;
    this.dirtyMaxX = -Infinity;
    this.dirtyMinY = Infinity;
    this.dirtyMaxY = -Infinity;
  }

  /**
   * Sets pixel on active layer and records old state for dirty rect
   */
  private paintPixel(layer: Layer, x: number, y: number, color32: number): void {
    if (this.projectionMode === 'wrap') {
      x = wrapCoordinate(x, this.document.width);
      y = wrapCoordinate(y, this.document.height);
    } else {
      if (x < 0 || x >= this.document.width || y < 0 || y >= this.document.height) return;
    }

    const idx = y * this.document.width + x;
    const oldVal = layer.buffer[idx];
    if (oldVal === color32) return;

    if (!this.modifiedPixelsMap.has(idx)) {
      this.modifiedPixelsMap.set(idx, oldVal);
    }
    layer.buffer[idx] = color32;

    this.dirtyMinX = Math.min(this.dirtyMinX, x);
    this.dirtyMaxX = Math.max(this.dirtyMaxX, x);
    this.dirtyMinY = Math.min(this.dirtyMinY, y);
    this.dirtyMaxY = Math.max(this.dirtyMaxY, y);
  }

  /**
   * Commits current stroke modifications to the History stack
   */
  private commitStroke(description: string, layer: Layer): void {
    if (this.modifiedPixelsMap.size === 0) return;

    const rect: Rect = {
      x: this.dirtyMinX,
      y: this.dirtyMinY,
      width: this.dirtyMaxX - this.dirtyMinX + 1,
      height: this.dirtyMaxY - this.dirtyMinY + 1
    };

    const layerBuffer = new PixelBuffer(this.document.width, this.document.height, layer.buffer);
    const newPixels = layerBuffer.extractRect(rect);

    // Build oldPixels snapshot
    const oldPixels = new Uint32Array(rect.width * rect.height);
    for (let r = 0; r < rect.height; r++) {
      const curY = rect.y + r;
      for (let c = 0; c < rect.width; c++) {
        const curX = rect.x + c;
        const idx = curY * this.document.width + curX;
        if (this.modifiedPixelsMap.has(idx)) {
          oldPixels[r * rect.width + c] = this.modifiedPixelsMap.get(idx)!;
        } else {
          oldPixels[r * rect.width + c] = layer.buffer[idx];
        }
      }
    }

    const command = new DrawRectCommand(description, layerBuffer, rect, oldPixels, newPixels);
    this.history.push(command);
    this.document.notify();
  }

  // --- Interaction Handlers ---

  public handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>, containerRect: DOMRect): void {
    if (e.button === 1 || this.isSpacePressed) {
      // Middle click or space pan
      this.isPanning = true;
      return;
    }

    if (e.button !== 0) return; // Only left-click draws

    const p = this.viewport.screenToPixel(e.clientX, e.clientY, containerRect);
    this.isDrawing = true;
    this.strokeStartPixel = p;
    this.lastStrokePixel = p;

    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    if (this.currentTool === 'picker') {
      const composite = this.document.composite();
      const col = composite.getPixel(p.x, p.y);
      if ((col & 0xFF000000) !== 0) {
        this.setColor(uint32ToHex(col));
      }
      this.isDrawing = false;
      return;
    }

    if (this.currentTool === 'bucket') {
      this.startStrokeTracking();
      const buf = new PixelBuffer(this.document.width, this.document.height, activeLayer.buffer);
      const dirty = floodFill(buf, p.x, p.y, this.primaryColor32);
      if (dirty) {
        // Record all affected pixels
        for (let r = dirty.y; r < dirty.y + dirty.height; r++) {
          for (let c = dirty.x; c < dirty.x + dirty.width; c++) {
            const idx = r * this.document.width + c;
            if (activeLayer.buffer[idx] !== buf.data[idx]) {
              this.paintPixel(activeLayer, c, r, buf.data[idx]);
            }
          }
        }
        this.commitStroke('Balde de Tinta', activeLayer);
      }
      this.isDrawing = false;
      return;
    }

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      this.startStrokeTracking();
      const color = this.currentTool === 'eraser' ? 0 : this.primaryColor32;
      this.paintPixel(activeLayer, p.x, p.y, color);
      this.document.notify();
    }
  }

  public handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>, containerRect: DOMRect): void {
    if (this.isPanning) {
      this.viewport.panBy(e.movementX, e.movementY);
      return;
    }

    const p = this.viewport.screenToPixel(e.clientX, e.clientY, containerRect);
    this.currentHoverPixel = p;

    if (!this.isDrawing) {
      this.notifyState();
      return;
    }

    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      const color = this.currentTool === 'eraser' ? 0 : this.primaryColor32;
      // Bresenham line between last point and current point to prevent gaps during fast mouse drag
      bresenhamLine(this.lastStrokePixel.x, this.lastStrokePixel.y, p.x, p.y, (x, y) => {
        this.paintPixel(activeLayer, x, y, color);
      });
      this.lastStrokePixel = p;
      this.document.notify();
    } else if (this.currentTool === 'line') {
      // Preview line with active projection constraint!
      this.previewBuffer.clear();
      let target = p;
      if (this.projectionMode === 'isometric') {
        target = snapToIsometricAxis(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y);
      } else if (e.shiftKey) {
        target = snapToOrthoAxis(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y);
      }
      bresenhamLine(this.strokeStartPixel.x, this.strokeStartPixel.y, target.x, target.y, (x, y) => {
        this.previewBuffer.setPixel(x, y, this.primaryColor32);
      });
      this.notifyState();
    } else if (this.currentTool === 'rectangle') {
      this.previewBuffer.clear();
      drawRectOutline(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y, (x, y) => {
        this.previewBuffer.setPixel(x, y, this.primaryColor32);
      });
      this.notifyState();
    } else if (this.currentTool === 'isocube') {
      this.previewBuffer.clear();
      // Calculate steps based on distance
      const dx = p.x - this.strokeStartPixel.x;
      const dy = p.y - this.strokeStartPixel.y;
      const wSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dx) / 4) || 2));
      const dSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dy) / 4) || 2));
      const hPixels = Math.max(2, Math.min(32, Math.abs(dy)));
      const shades = deriveIsoShades(this.primaryColor32);

      drawIsoCube(this.strokeStartPixel, wSteps, dSteps, hPixels, shades.top, shades.left, shades.right, (x, y, col) => {
        this.previewBuffer.setPixel(x, y, col);
      });
      this.notifyState();
    }
  }

  public handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>, containerRect: DOMRect): void {
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    const p = this.viewport.screenToPixel(e.clientX, e.clientY, containerRect);

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      this.commitStroke(this.currentTool === 'pencil' ? 'Pincel' : 'Borracha', activeLayer);
    } else if (this.currentTool === 'line') {
      let target = p;
      if (this.projectionMode === 'isometric') {
        target = snapToIsometricAxis(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y);
      } else if (e.shiftKey) {
        target = snapToOrthoAxis(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y);
      }

      this.startStrokeTracking();
      bresenhamLine(this.strokeStartPixel.x, this.strokeStartPixel.y, target.x, target.y, (x, y) => {
        this.paintPixel(activeLayer, x, y, this.primaryColor32);
      });
      this.previewBuffer.clear();
      this.commitStroke('Linha', activeLayer);
    } else if (this.currentTool === 'rectangle') {
      this.startStrokeTracking();
      drawRectOutline(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y, (x, y) => {
        this.paintPixel(activeLayer, x, y, this.primaryColor32);
      });
      this.previewBuffer.clear();
      this.commitStroke('Retângulo', activeLayer);
    } else if (this.currentTool === 'isocube') {
      this.startStrokeTracking();
      const dx = p.x - this.strokeStartPixel.x;
      const dy = p.y - this.strokeStartPixel.y;
      const wSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dx) / 4) || 2));
      const dSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dy) / 4) || 2));
      const hPixels = Math.max(2, Math.min(32, Math.abs(dy)));
      const shades = deriveIsoShades(this.primaryColor32);

      drawIsoCube(this.strokeStartPixel, wSteps, dSteps, hPixels, shades.top, shades.left, shades.right, (x, y, col) => {
        this.paintPixel(activeLayer, x, y, col);
      });
      this.previewBuffer.clear();
      this.commitStroke('Bloco Isométrico', activeLayer);
    }

    this.notifyState();
  }

  public handleWheel(e: React.WheelEvent<HTMLDivElement>, containerRect: DOMRect): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    const newZoom = this.viewport.zoom * factor;
    this.viewport.setZoom(newZoom, { x: e.clientX, y: e.clientY }, containerRect);
  }
}
