import { describe, it, expect } from 'vitest';
import { swapColor, adjustBrightness, getPaletteShade } from '../shading';
import { PixelBuffer } from '../pixel-buffer';
import { hexToUint32, uint32ToRgba } from '../color';

describe('Shading & Color Swapping', () => {
  it('swapColor replaces target colors across the buffer and returns correct dirty rect', () => {
    const buffer = new PixelBuffer(8, 8);
    const colorA = 0xFF112233;
    const colorB = 0xFFAABBCC;

    buffer.setPixel(2, 2, colorA);
    buffer.setPixel(4, 5, colorA);

    const dirtyRect = swapColor(buffer, colorA, colorB);
    expect(dirtyRect).toEqual({
      x: 2,
      y: 2,
      width: 3,  // 4 - 2 + 1
      height: 4  // 5 - 2 + 1
    });

    expect(buffer.getPixel(2, 2)).toBe(colorB);
    expect(buffer.getPixel(4, 5)).toBe(colorB);

    // Swapping identical color should return null
    expect(swapColor(buffer, colorB, colorB)).toBeNull();
  });

  it('adjustBrightness scales RGB channels without touching alpha', () => {
    const col = hexToUint32('#808080'); // 128, 128, 128, 255
    const darkened = adjustBrightness(col, 0.5);
    const [r, g, b, a] = uint32ToRgba(darkened);

    expect(r).toBe(64);
    expect(g).toBe(64);
    expect(b).toBe(64);
    expect(a).toBe(255);
  });

  it('getPaletteShade finds neighboring darker or lighter colors in palette', () => {
    const palette = ['#000000', '#555555', '#AAAAAA', '#FFFFFF'];

    const darker = getPaletteShade('#AAAAAA', palette, 'darker');
    expect(darker).toBe('#555555');

    const lighter = getPaletteShade('#AAAAAA', palette, 'lighter');
    expect(lighter).toBe('#FFFFFF');
  });
});
