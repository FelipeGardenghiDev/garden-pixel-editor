import type { Rect } from './types';

export class PixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public data: Uint32Array;

  constructor(width: number, height: number, initialData?: Uint32Array) {
    this.width = width;
    this.height = height;
    if (initialData && initialData.length === width * height) {
      this.data = new Uint32Array(initialData);
    } else {
      this.data = new Uint32Array(width * height);
    }
  }

  public getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  public setPixel(x: number, y: number, color32: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const idx = y * this.width + x;
    if (this.data[idx] === color32) return false;
    this.data[idx] = color32;
    return true;
  }

  public clear(): void {
    this.data.fill(0);
  }

  public clone(): PixelBuffer {
    return new PixelBuffer(this.width, this.height, this.data);
  }

  /**
   * Extracts a sub-rectangle of pixels for memory-efficient dirty-rect diffs.
   */
  public extractRect(rect: Rect): Uint32Array {
    const { x, y, width, height } = rect;
    const sub = new Uint32Array(width * height);
    for (let row = 0; row < height; row++) {
      const srcY = y + row;
      if (srcY < 0 || srcY >= this.height) continue;
      for (let col = 0; col < width; col++) {
        const srcX = x + col;
        if (srcX < 0 || srcX >= this.width) continue;
        sub[row * width + col] = this.data[srcY * this.width + srcX];
      }
    }
    return sub;
  }

  /**
   * Pastes a sub-rectangle of pixels back into this buffer.
   */
  public blitRect(rect: Rect, sub: Uint32Array): void {
    const { x, y, width, height } = rect;
    for (let row = 0; row < height; row++) {
      const dstY = y + row;
      if (dstY < 0 || dstY >= this.height) continue;
      for (let col = 0; col < width; col++) {
        const dstX = x + col;
        if (dstX < 0 || dstX >= this.width) continue;
        this.data[dstY * this.width + dstX] = sub[row * width + col];
      }
    }
  }
}
