import type { ToolType, ProjectionMode, Point, Rect, Layer, DitherMode } from './types';
import { PixelDocument } from './document';
import { Viewport } from './viewport';
import { HistoryManager, DrawRectCommand } from './history';
import { PixelBuffer } from './pixel-buffer';
import { hexToUint32, uint32ToHex } from './color';
import { 
  bresenhamLine, drawRectOutline, floodFill, drawIsoCube, deriveIsoShades,
  drawEllipseOutline, drawIsoCylinder, drawIsoRamp, isDitherPixel 
} from './algorithms';
import { snapToIsometricAxis, snapToOrthoAxis, wrapCoordinate } from './constraints';
import { swapColor, getPaletteShade } from './shading';
import { saveAutosave } from './project-file';

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

  // Brush and Dithering settings
  public brushSize: number = 1; // 1 to 4
  public pixelPerfect: boolean = false;
  public ditherMode: DitherMode = 'none';

  // Animation & Timeline state
  public fps: number = 8;
  public isPlaying: boolean = false;
  public onionSkinning: boolean = false;
  private animTimer: number | null = null;

  // Active stroke / tool preview state
  public isDrawing: boolean = false;
  public isPanning: boolean = false;
  private strokeStartPixel: Point = { x: 0, y: 0 };
  private lastStrokePixel: Point = { x: 0, y: 0 };
  public currentHoverPixel: Point | null = null;
  public previewBuffer: PixelBuffer; // Temporary overlay buffer for previewing lines/boxes

  // Selection & Transformation state
  public selectionRect: Rect | null = null;
  public floatingSelection: { buffer: PixelBuffer; rect: Rect; originalLayerId: string } | null = null;
  private isMovingSelection: boolean = false;
  private moveDragStart: Point = { x: 0, y: 0 };
  private initialFloatingPos: Point = { x: 0, y: 0 };

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
    if (this.currentTool === 'select' && tool !== 'select') {
      this.commitFloatingSelection();
    }
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

  // --- Animation & Timeline Controls ---

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!this.isPlaying) return;
      const interval = 1000 / this.fps;
      if (now - lastTime >= interval) {
        lastTime = now;
        this.nextFrame();
      }
      this.animTimer = requestAnimationFrame(tick);
    };

    this.animTimer = requestAnimationFrame(tick);
    this.notifyState();
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.animTimer !== null) {
      cancelAnimationFrame(this.animTimer);
      this.animTimer = null;
    }
    this.notifyState();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setFps(fps: number): void {
    this.fps = Math.max(1, Math.min(30, fps));
    this.notifyState();
  }

  public toggleOnionSkinning(): void {
    this.onionSkinning = !this.onionSkinning;
    this.notifyState();
  }

  public addFrame(copyPrevious: boolean = false): void {
    this.document.addFrame(copyPrevious);
    this.notifyState();
  }

  public duplicateFrame(): void {
    this.document.duplicateFrame();
    this.notifyState();
  }

  public deleteFrame(): void {
    this.document.deleteFrame();
    this.notifyState();
  }

  public setFrame(index: number): void {
    this.document.setActiveFrame(index);
    this.notifyState();
  }

  public nextFrame(): void {
    const nextIdx = (this.document.activeFrameIndex + 1) % this.document.frames.length;
    this.document.setActiveFrame(nextIdx);
    this.notifyState();
  }

  public prevFrame(): void {
    const prevIdx = (this.document.activeFrameIndex - 1 + this.document.frames.length) % this.document.frames.length;
    this.document.setActiveFrame(prevIdx);
    this.notifyState();
  }

  // --- Brush & Shading Settings ---

  public setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(4, size));
    this.notifyState();
  }

  public togglePixelPerfect(): void {
    this.pixelPerfect = !this.pixelPerfect;
    this.notifyState();
  }

  public setDitherMode(mode: DitherMode): void {
    this.ditherMode = mode;
    this.notifyState();
  }

  public swapColor(fromHex: string, toHex: string): void {
    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer) return;
    const from32 = hexToUint32(fromHex);
    const to32 = hexToUint32(toHex);
    const layerBuf = new PixelBuffer(this.document.width, this.document.height, activeLayer.buffer, true);
    const dirty = swapColor(layerBuf, from32, to32, this.selectionRect || undefined);
    if (dirty) {
      const oldPixels = new Uint32Array(dirty.width * dirty.height);
      const newPixels = layerBuf.extractRect(dirty);
      for (let i = 0; i < newPixels.length; i++) {
        oldPixels[i] = newPixels[i] === to32 ? from32 : newPixels[i];
      }
      this.history.push(new DrawRectCommand(
        'Substituir Cor',
        layerBuf,
        dirty,
        oldPixels,
        newPixels,
        () => this.document.notify()
      ));
      this.document.notify();
    }
  }

  public shadeActiveColor(direction: 'darker' | 'lighter'): void {
    const newHex = getPaletteShade(this.primaryColor, this.document.activePalette.colors, direction);
    this.setColor(newHex);
  }

  // --- Selection & Transformation Actions ---

  public commitFloatingSelection(): void {
    if (!this.floatingSelection) return;

    const layer = this.document.layers.find(l => l.id === this.floatingSelection!.originalLayerId) || this.document.getActiveLayer();
    if (layer) {
      const layerBuffer = new PixelBuffer(this.document.width, this.document.height, layer.buffer, true);
      const stampRect: Rect = {
        x: Math.max(0, this.floatingSelection.rect.x),
        y: Math.max(0, this.floatingSelection.rect.y),
        width: Math.min(this.document.width - Math.max(0, this.floatingSelection.rect.x), this.floatingSelection.rect.width),
        height: Math.min(this.document.height - Math.max(0, this.floatingSelection.rect.y), this.floatingSelection.rect.height)
      };

      if (stampRect.width > 0 && stampRect.height > 0) {
        const oldPixels = layerBuffer.extractRect(stampRect);
        layerBuffer.blitBuffer(this.floatingSelection.rect.x, this.floatingSelection.rect.y, this.floatingSelection.buffer, true);
        const newPixels = layerBuffer.extractRect(stampRect);

        this.history.push(new DrawRectCommand(
          'Mover Seleção',
          layerBuffer,
          stampRect,
          oldPixels,
          newPixels,
          () => this.document.notify()
        ));
      }
    }

    this.floatingSelection = null;
    this.document.notify();
  }

  public liftSelection(): void {
    if (!this.selectionRect || this.floatingSelection) return;
    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer) return;

    const layerBuffer = new PixelBuffer(this.document.width, this.document.height, activeLayer.buffer, true);
    const extracted = layerBuffer.extractBuffer(this.selectionRect);

    const oldPixels = layerBuffer.extractRect(this.selectionRect);
    layerBuffer.clearRect(this.selectionRect);
    const newPixels = layerBuffer.extractRect(this.selectionRect);

    this.history.push(new DrawRectCommand(
      'Recortar Seleção',
      layerBuffer,
      this.selectionRect,
      oldPixels,
      newPixels,
      () => this.document.notify()
    ));

    this.floatingSelection = {
      buffer: extracted,
      rect: { ...this.selectionRect },
      originalLayerId: activeLayer.id
    };
    this.document.notify();
  }

  public clearSelection(): void {
    this.commitFloatingSelection();
    this.selectionRect = null;
    this.notifyState();
  }

  public deleteSelection(): void {
    if (this.floatingSelection) {
      this.floatingSelection = null;
      this.selectionRect = null;
      this.document.notify();
      return;
    }

    if (this.selectionRect) {
      const activeLayer = this.document.getActiveLayer();
      if (activeLayer) {
        const layerBuffer = new PixelBuffer(this.document.width, this.document.height, activeLayer.buffer, true);
        const oldPixels = layerBuffer.extractRect(this.selectionRect);
        layerBuffer.clearRect(this.selectionRect);
        const newPixels = layerBuffer.extractRect(this.selectionRect);

        this.history.push(new DrawRectCommand(
          'Deletar Seleção',
          layerBuffer,
          this.selectionRect,
          oldPixels,
          newPixels,
          () => this.document.notify()
        ));
      }
      this.selectionRect = null;
      this.document.notify();
    }
  }

  public selectAll(): void {
    this.commitFloatingSelection();
    this.selectionRect = { x: 0, y: 0, width: this.document.width, height: this.document.height };
    this.notifyState();
  }

  public flipHorizontal(): void {
    if (this.floatingSelection) {
      this.floatingSelection.buffer.flipHorizontal();
      this.notifyState();
      return;
    }

    if (this.selectionRect) {
      this.liftSelection();
      const fs = this.floatingSelection as { buffer: PixelBuffer; rect: Rect; originalLayerId: string } | null;
      if (fs) {
        fs.buffer.flipHorizontal();
      }
      this.notifyState();
      return;
    }

    // Flip whole active layer
    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer) return;
    const layerBuffer = new PixelBuffer(this.document.width, this.document.height, activeLayer.buffer, true);
    const fullRect: Rect = { x: 0, y: 0, width: this.document.width, height: this.document.height };
    const oldPixels = layerBuffer.extractRect(fullRect);
    layerBuffer.flipHorizontal();
    const newPixels = layerBuffer.extractRect(fullRect);

    this.history.push(new DrawRectCommand(
      'Inverter Horizontal',
      layerBuffer,
      fullRect,
      oldPixels,
      newPixels,
      () => this.document.notify()
    ));
    this.document.notify();
  }

  public flipVertical(): void {
    if (this.floatingSelection) {
      this.floatingSelection.buffer.flipVertical();
      this.notifyState();
      return;
    }

    if (this.selectionRect) {
      this.liftSelection();
      const fs = this.floatingSelection as { buffer: PixelBuffer; rect: Rect; originalLayerId: string } | null;
      if (fs) {
        fs.buffer.flipVertical();
      }
      this.notifyState();
      return;
    }

    // Flip whole active layer
    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer) return;
    const layerBuffer = new PixelBuffer(this.document.width, this.document.height, activeLayer.buffer, true);
    const fullRect: Rect = { x: 0, y: 0, width: this.document.width, height: this.document.height };
    const oldPixels = layerBuffer.extractRect(fullRect);
    layerBuffer.flipVertical();
    const newPixels = layerBuffer.extractRect(fullRect);

    this.history.push(new DrawRectCommand(
      'Inverter Vertical',
      layerBuffer,
      fullRect,
      oldPixels,
      newPixels,
      () => this.document.notify()
    ));
    this.document.notify();
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
   * Sets pixel on active layer and records old state for dirty rect, supporting brushSize and dithering.
   */
  private paintPixel(layer: Layer, x: number, y: number, color32: number, checkDither: boolean = true): void {
    const size = this.currentTool === 'eraser' 
      ? Math.max(1, this.brushSize) 
      : (this.currentTool === 'pencil' || this.currentTool === 'dither' ? this.brushSize : 1);
    
    const dither = this.currentTool === 'dither' 
      ? (this.ditherMode === 'none' ? 'checker' : this.ditherMode) 
      : this.ditherMode;

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        let px = x + dx;
        let py = y + dy;

        if (checkDither && dither !== 'none' && this.currentTool !== 'eraser') {
          if (!isDitherPixel(px, py, dither)) continue;
        }

        if (this.projectionMode === 'wrap') {
          px = wrapCoordinate(px, this.document.width);
          py = wrapCoordinate(py, this.document.height);
        } else {
          if (px < 0 || px >= this.document.width || py < 0 || py >= this.document.height) continue;
        }

        const idx = py * this.document.width + px;
        const oldVal = layer.buffer[idx];
        if (oldVal === color32) continue;

        if (!this.modifiedPixelsMap.has(idx)) {
          this.modifiedPixelsMap.set(idx, oldVal);
        }
        layer.buffer[idx] = color32;

        this.dirtyMinX = Math.min(this.dirtyMinX, px);
        this.dirtyMaxX = Math.max(this.dirtyMaxX, px);
        this.dirtyMinY = Math.min(this.dirtyMinY, py);
        this.dirtyMaxY = Math.max(this.dirtyMaxY, py);
      }
    }
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

    const layerBuffer = new PixelBuffer(this.document.width, this.document.height, layer.buffer, true);
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

    const command = new DrawRectCommand(description, layerBuffer, rect, oldPixels, newPixels, () => this.document.notify());
    this.history.push(command);
    this.document.notify();
    saveAutosave(this);
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

    if (this.currentTool === 'select') {
      if (this.selectionRect &&
          p.x >= this.selectionRect.x && p.x < this.selectionRect.x + this.selectionRect.width &&
          p.y >= this.selectionRect.y && p.y < this.selectionRect.y + this.selectionRect.height) {
        if (!this.floatingSelection) {
          this.liftSelection();
        }
        this.isMovingSelection = true;
        this.moveDragStart = p;
        this.initialFloatingPos = { x: this.selectionRect.x, y: this.selectionRect.y };
      } else {
        this.commitFloatingSelection();
        this.isDrawing = true;
        this.strokeStartPixel = p;
        this.selectionRect = { x: p.x, y: p.y, width: 1, height: 1 };
        this.notifyState();
      }
      return;
    }

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

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser' || this.currentTool === 'dither') {
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

    if (this.currentTool === 'select') {
      if (this.isMovingSelection && this.floatingSelection) {
        const dx = p.x - this.moveDragStart.x;
        const dy = p.y - this.moveDragStart.y;
        this.floatingSelection.rect.x = this.initialFloatingPos.x + dx;
        this.floatingSelection.rect.y = this.initialFloatingPos.y + dy;
        this.selectionRect = { ...this.floatingSelection.rect };
        this.notifyState();
        return;
      } else if (this.isDrawing) {
        const minX = Math.max(0, Math.min(this.strokeStartPixel.x, p.x));
        const minY = Math.max(0, Math.min(this.strokeStartPixel.y, p.y));
        const maxX = Math.min(this.document.width - 1, Math.max(this.strokeStartPixel.x, p.x));
        const maxY = Math.min(this.document.height - 1, Math.max(this.strokeStartPixel.y, p.y));
        this.selectionRect = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        };
        this.notifyState();
        return;
      }
    }

    if (!this.isDrawing) {
      this.notifyState();
      return;
    }

    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser' || this.currentTool === 'dither') {
      const color = this.currentTool === 'eraser' ? 0 : this.primaryColor32;
      bresenhamLine(this.lastStrokePixel.x, this.lastStrokePixel.y, p.x, p.y, (x, y) => {
        this.paintPixel(activeLayer, x, y, color);
      });
      this.lastStrokePixel = p;
      this.document.notify();
    } else if (this.currentTool === 'line') {
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
    } else if (this.currentTool === 'circle') {
      this.previewBuffer.clear();
      drawEllipseOutline(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y, (x, y) => {
        this.previewBuffer.setPixel(x, y, this.primaryColor32);
      });
      this.notifyState();
    } else if (this.currentTool === 'isocube') {
      this.previewBuffer.clear();
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
    } else if (this.currentTool === 'isocylinder') {
      this.previewBuffer.clear();
      const dx = p.x - this.strokeStartPixel.x;
      const dy = p.y - this.strokeStartPixel.y;
      const radius = Math.max(2, Math.min(24, Math.abs(dx)));
      const hPixels = Math.max(2, Math.min(32, Math.abs(dy)));
      const shades = deriveIsoShades(this.primaryColor32);

      drawIsoCylinder(this.strokeStartPixel, radius, hPixels, shades.top, shades.left, shades.right, (x, y, col) => {
        this.previewBuffer.setPixel(x, y, col);
      });
      this.notifyState();
    } else if (this.currentTool === 'isoramp') {
      this.previewBuffer.clear();
      const dx = p.x - this.strokeStartPixel.x;
      const dy = p.y - this.strokeStartPixel.y;
      const wSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dx) / 4) || 2));
      const dSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dy) / 4) || 2));
      const hPixels = Math.max(2, Math.min(32, Math.abs(dy)));
      const shades = deriveIsoShades(this.primaryColor32);

      drawIsoRamp(this.strokeStartPixel, wSteps, dSteps, hPixels, shades.top, shades.left, shades.right, (x, y, col) => {
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

    if (this.currentTool === 'select') {
      if (this.isMovingSelection) {
        this.isMovingSelection = false;
        this.notifyState();
        return;
      }
      if (this.isDrawing) {
        this.isDrawing = false;
        const p = this.viewport.screenToPixel(e.clientX, e.clientY, containerRect);
        if (this.selectionRect && this.selectionRect.width <= 1 && this.selectionRect.height <= 1 &&
            this.strokeStartPixel.x === p.x && this.strokeStartPixel.y === p.y) {
          this.selectionRect = null;
        }
        this.notifyState();
        return;
      }
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    const activeLayer = this.document.getActiveLayer();
    if (!activeLayer || !activeLayer.visible) return;

    const p = this.viewport.screenToPixel(e.clientX, e.clientY, containerRect);

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser' || this.currentTool === 'dither') {
      const desc = this.currentTool === 'eraser' ? 'Borracha' : (this.currentTool === 'dither' ? 'Dithering' : 'Pincel');
      this.commitStroke(desc, activeLayer);
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
    } else if (this.currentTool === 'circle') {
      this.startStrokeTracking();
      drawEllipseOutline(this.strokeStartPixel.x, this.strokeStartPixel.y, p.x, p.y, (x, y) => {
        this.paintPixel(activeLayer, x, y, this.primaryColor32);
      });
      this.previewBuffer.clear();
      this.commitStroke('Círculo / Elipse', activeLayer);
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
    } else if (this.currentTool === 'isocylinder') {
      this.startStrokeTracking();
      const dx = p.x - this.strokeStartPixel.x;
      const dy = p.y - this.strokeStartPixel.y;
      const radius = Math.max(2, Math.min(24, Math.abs(dx)));
      const hPixels = Math.max(2, Math.min(32, Math.abs(dy)));
      const shades = deriveIsoShades(this.primaryColor32);

      drawIsoCylinder(this.strokeStartPixel, radius, hPixels, shades.top, shades.left, shades.right, (x, y, col) => {
        this.paintPixel(activeLayer, x, y, col);
      });
      this.previewBuffer.clear();
      this.commitStroke('Cilindro Isométrico', activeLayer);
    } else if (this.currentTool === 'isoramp') {
      this.startStrokeTracking();
      const dx = p.x - this.strokeStartPixel.x;
      const dy = p.y - this.strokeStartPixel.y;
      const wSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dx) / 4) || 2));
      const dSteps = Math.max(1, Math.min(16, Math.round(Math.abs(dy) / 4) || 2));
      const hPixels = Math.max(2, Math.min(32, Math.abs(dy)));
      const shades = deriveIsoShades(this.primaryColor32);

      drawIsoRamp(this.strokeStartPixel, wSteps, dSteps, hPixels, shades.top, shades.left, shades.right, (x, y, col) => {
        this.paintPixel(activeLayer, x, y, col);
      });
      this.previewBuffer.clear();
      this.commitStroke('Rampa Isométrica', activeLayer);
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
