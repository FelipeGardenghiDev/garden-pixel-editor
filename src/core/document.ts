import type { Layer, Palette, Frame } from './types';
import { PixelBuffer } from './pixel-buffer';
import { blendUint32 } from './color';

export class PixelDocument {
  public width: number;
  public height: number;
  public frames: Frame[] = [];
  public activeFrameIndex: number = 0;
  public activePalette: Palette;

  private onChangeCallbacks: Array<() => void> = [];

  constructor(width: number = 48, height: number = 48, palette?: Palette) {
    this.width = width;
    this.height = height;
    this.activePalette = palette || {
      id: 'default',
      name: 'Default 16',
      colors: [
        '#000000', '#1D2B53', '#7E2553', '#008751',
        '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
        '#FF004D', '#FFA300', '#FFEC27', '#00E436',
        '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
      ]
    };

    // Default base layer & first frame
    const baseLayer: Layer = {
      id: 'layer-1',
      name: 'Camada 1',
      visible: true,
      opacity: 1,
      buffer: new Uint32Array(width * height)
    };

    const firstFrame: Frame = {
      id: 'frame-1',
      name: 'Quadro 1',
      layers: [baseLayer],
      activeLayerId: baseLayer.id
    };

    this.frames.push(firstFrame);
    this.activeFrameIndex = 0;
  }

  // Compatibility getter/setter for layers of the active frame
  public get layers(): Layer[] {
    const frame = this.frames[this.activeFrameIndex] || this.frames[0];
    return frame ? frame.layers : [];
  }

  public set layers(newLayers: Layer[]) {
    const frame = this.frames[this.activeFrameIndex] || this.frames[0];
    if (frame) {
      frame.layers = newLayers;
    }
  }

  public get activeLayerId(): string {
    const frame = this.frames[this.activeFrameIndex] || this.frames[0];
    return frame ? frame.activeLayerId : '';
  }

  public set activeLayerId(id: string) {
    const frame = this.frames[this.activeFrameIndex] || this.frames[0];
    if (frame) {
      frame.activeLayerId = id;
    }
  }

  public onChange(cb: () => void): () => void {
    this.onChangeCallbacks.push(cb);
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(c => c !== cb);
    };
  }

  public notify(): void {
    for (const cb of this.onChangeCallbacks) {
      cb();
    }
  }

  public getActiveFrame(): Frame {
    return this.frames[this.activeFrameIndex] || this.frames[0];
  }

  public setActiveFrame(index: number): void {
    if (index >= 0 && index < this.frames.length && index !== this.activeFrameIndex) {
      this.activeFrameIndex = index;
      this.notify();
    }
  }

  public addFrame(copyPrevious: boolean = false): Frame {
    const currentFrame = this.getActiveFrame();
    const frameNum = this.frames.length + 1;
    const newLayers: Layer[] = [];

    if (copyPrevious && currentFrame) {
      for (const l of currentFrame.layers) {
        newLayers.push({
          id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: l.name,
          visible: l.visible,
          opacity: l.opacity,
          buffer: new Uint32Array(l.buffer)
        });
      }
    } else {
      newLayers.push({
        id: `layer-${Date.now()}-1`,
        name: 'Camada 1',
        visible: true,
        opacity: 1,
        buffer: new Uint32Array(this.width * this.height)
      });
    }

    const newFrame: Frame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Quadro ${frameNum}`,
      layers: newLayers,
      activeLayerId: newLayers[0].id
    };

    this.frames.push(newFrame);
    this.activeFrameIndex = this.frames.length - 1;
    this.notify();
    return newFrame;
  }

  public duplicateFrame(index: number = this.activeFrameIndex): Frame {
    const srcFrame = this.frames[index];
    if (!srcFrame) return this.addFrame();

    const newLayers: Layer[] = srcFrame.layers.map(l => ({
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      buffer: new Uint32Array(l.buffer)
    }));

    const newFrame: Frame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${srcFrame.name} (Cópia)`,
      layers: newLayers,
      activeLayerId: newLayers[0].id
    };

    this.frames.splice(index + 1, 0, newFrame);
    this.activeFrameIndex = index + 1;
    this.notify();
    return newFrame;
  }

  public deleteFrame(index: number = this.activeFrameIndex): boolean {
    if (this.frames.length <= 1) return false; // Must keep at least 1 frame
    this.frames.splice(index, 1);
    this.activeFrameIndex = Math.max(0, Math.min(this.frames.length - 1, this.activeFrameIndex));
    this.notify();
    return true;
  }

  public getActiveLayer(): Layer | undefined {
    return this.layers.find(l => l.id === this.activeLayerId) || this.layers[0];
  }

  public addLayer(name?: string): Layer {
    const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newLayer: Layer = {
      id,
      name: name || `Camada ${this.layers.length + 1}`,
      visible: true,
      opacity: 1,
      buffer: new Uint32Array(this.width * this.height)
    };
    this.layers.push(newLayer);
    this.activeLayerId = id;
    this.notify();
    return newLayer;
  }

  public deleteLayer(id: string): boolean {
    if (this.layers.length <= 1) return false; // Keep at least one
    this.layers = this.layers.filter(l => l.id !== id);
    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[this.layers.length - 1].id;
    }
    this.notify();
    return true;
  }

  public toggleLayerVisibility(id: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      this.notify();
    }
  }

  /**
   * Composites all visible layers of a given frame into a single PixelBuffer.
   */
  public composite(targetBuffer?: PixelBuffer, frameIndex: number = this.activeFrameIndex): PixelBuffer {
    const output = targetBuffer || new PixelBuffer(this.width, this.height);
    output.clear();

    const frame = this.frames[frameIndex] || this.frames[0];
    if (!frame) return output;

    for (const layer of frame.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      for (let i = 0; i < output.data.length; i++) {
        const fg = layer.buffer[i];
        if ((fg & 0xFF000000) === 0) continue; // transparent pixel
        output.data[i] = blendUint32(output.data[i], fg, layer.opacity);
      }
    }

    return output;
  }
}
