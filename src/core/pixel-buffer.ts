import type { Rect } from './types';

export class PixelBuffer {
  public readonly width: number;
  public readonly height: number;
  public data: Uint32Array;

  constructor(width: number, height: number, initialData?: Uint32Array, shareBuffer: boolean = false) {
    this.width = width;
    this.height = height;
    if (initialData && initialData.length === width * height) {
      this.data = shareBuffer ? initialData : new Uint32Array(initialData);
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
   * Extracts a sub-rectangle of pixels into a new standalone PixelBuffer.
   */
  public extractBuffer(rect: Rect): PixelBuffer {
    const sub = this.extractRect(rect);
    return new PixelBuffer(rect.width, rect.height, sub);
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

  /**
   * Pastes an entire source PixelBuffer into this buffer at (destX, destY).
   */
  public blitBuffer(destX: number, destY: number, src: PixelBuffer, blendAlpha: boolean = false): void {
    for (let row = 0; row < src.height; row++) {
      const dstY = destY + row;
      if (dstY < 0 || dstY >= this.height) continue;
      for (let col = 0; col < src.width; col++) {
        const dstX = destX + col;
        if (dstX < 0 || dstX >= this.width) continue;
        const color = src.getPixel(col, row);
        if (blendAlpha && (color & 0xFF000000) === 0) continue;
        this.data[dstY * this.width + dstX] = color;
      }
    }
  }

  /**
   * Clears a rectangular region in this buffer with 0 (transparent).
   */
  public clearRect(rect: Rect): void {
    const { x, y, width, height } = rect;
    for (let row = 0; row < height; row++) {
      const dstY = y + row;
      if (dstY < 0 || dstY >= this.height) continue;
      for (let col = 0; col < width; col++) {
        const dstX = x + col;
        if (dstX < 0 || dstX >= this.width) continue;
        this.data[dstY * this.width + dstX] = 0;
      }
    }
  }

  /**
   * Flips this entire buffer (or a specified rect) horizontally.
   */
  public flipHorizontal(rect?: Rect): void {
    const r = rect || { x: 0, y: 0, width: this.width, height: this.height };
    for (let row = 0; row < r.height; row++) {
      const y = r.y + row;
      if (y < 0 || y >= this.height) continue;
      let left = r.x;
      let right = r.x + r.width - 1;
      while (left < right) {
        if (left >= 0 && right < this.width) {
          const idxL = y * this.width + left;
          const idxR = y * this.width + right;
          const tmp = this.data[idxL];
          this.data[idxL] = this.data[idxR];
          this.data[idxR] = tmp;
        }
        left++;
        right--;
      }
    }
  }

  /**
   * Flips this entire buffer (or a specified rect) vertically.
   */
  public flipVertical(rect?: Rect): void {
    const r = rect || { x: 0, y: 0, width: this.width, height: this.height };
    let top = r.y;
    let bottom = r.y + r.height - 1;
    while (top < bottom) {
      if (top >= 0 && bottom < this.height) {
        for (let col = 0; col < r.width; col++) {
          const x = r.x + col;
          if (x < 0 || x >= this.width) continue;
          const idxT = top * this.width + x;
          const idxB = bottom * this.width + x;
          const tmp = this.data[idxT];
          this.data[idxT] = this.data[idxB];
          this.data[idxB] = tmp;
        }
      }
      top++;
      bottom--;
    }
  }
}
