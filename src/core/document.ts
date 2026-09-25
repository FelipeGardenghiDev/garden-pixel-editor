import type { Layer, Palette } from './types';
import { PixelBuffer } from './pixel-buffer';
import { blendUint32 } from './color';

export class PixelDocument {
  public width: number;
  public height: number;
  public layers: Layer[] = [];
  public activeLayerId: string = '';
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

    // Default base layer
    const baseLayer: Layer = {
      id: 'layer-1',
      name: 'Camada 1',
      visible: true,
      opacity: 1,
      buffer: new Uint32Array(width * height)
    };
    this.layers.push(baseLayer);
    this.activeLayerId = baseLayer.id;
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

  public getActiveLayer(): Layer | undefined {
    return this.layers.find(l => l.id === this.activeLayerId);
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
   * Composites all visible layers into a single Uint32Array (or destination PixelBuffer)
   */
  public composite(targetBuffer?: PixelBuffer): PixelBuffer {
    const output = targetBuffer || new PixelBuffer(this.width, this.height);
    output.clear();

    for (const layer of this.layers) {
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
