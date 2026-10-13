import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../pixel-buffer';

describe('PixelBuffer (32-bit pixel matrix operations)', () => {
  it('initializes with zeros and sets/gets pixels correctly', () => {
    const buffer = new PixelBuffer(8, 8);
    expect(buffer.getPixel(0, 0)).toBe(0);

    const red = 0xFF0000FF;
    const changed = buffer.setPixel(3, 4, red);
    expect(changed).toBe(true);
    expect(buffer.getPixel(3, 4)).toBe(red);

    // Setting same pixel should return false (no mutation)
    expect(buffer.setPixel(3, 4, red)).toBe(false);

    // Out of bounds
    expect(buffer.getPixel(-1, 0)).toBe(0);
    expect(buffer.getPixel(8, 8)).toBe(0);
    expect(buffer.setPixel(-1, 0, red)).toBe(false);
  });

  it('correctly extracts sub-rectangles and blits them back (dirty-rect cycle)', () => {
    const buffer = new PixelBuffer(10, 10);
    const colorA = 0xFF112233;
    const colorB = 0xFFAABBCC;

    // Fill a 3x3 region at (2, 2)
    for (let y = 2; y < 5; y++) {
      for (let x = 2; x < 5; x++) {
        buffer.setPixel(x, y, colorA);
      }
    }

    // Extract that region
    const extracted = buffer.extractRect({ x: 2, y: 2, width: 3, height: 3 });
    expect(extracted.length).toBe(9);
    expect(extracted[0]).toBe(colorA);

    // Overwrite buffer with colorB
    for (let y = 2; y < 5; y++) {
      for (let x = 2; x < 5; x++) {
        buffer.setPixel(x, y, colorB);
      }
    }
    expect(buffer.getPixel(3, 3)).toBe(colorB);

    // Restore via blitRect
    buffer.blitRect({ x: 2, y: 2, width: 3, height: 3 }, extracted);
    expect(buffer.getPixel(3, 3)).toBe(colorA);
  });

  it('flips a buffer horizontally and vertically', () => {
    const buffer = new PixelBuffer(4, 4);
    const color = 0xFF00FFFF;
    // Set top-left pixel
    buffer.setPixel(0, 0, color);

    // Flip horizontal -> should now be at (3, 0)
    buffer.flipHorizontal();
    expect(buffer.getPixel(0, 0)).toBe(0);
    expect(buffer.getPixel(3, 0)).toBe(color);

    // Flip vertical -> should now be at (3, 3)
    buffer.flipVertical();
    expect(buffer.getPixel(3, 0)).toBe(0);
    expect(buffer.getPixel(3, 3)).toBe(color);
  });

  it('clones buffer independently', () => {
    const buffer = new PixelBuffer(4, 4);
    buffer.setPixel(1, 1, 0xFFFFFFFF);
    const clone = buffer.clone();

    expect(clone.getPixel(1, 1)).toBe(0xFFFFFFFF);
    clone.setPixel(1, 1, 0);
    // Original must be untouched
    expect(buffer.getPixel(1, 1)).toBe(0xFFFFFFFF);
  });
});
