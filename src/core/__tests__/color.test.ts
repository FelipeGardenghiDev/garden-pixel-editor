import { describe, it, expect } from 'vitest';
import { 
  rgbaToUint32, 
  hexToUint32, 
  uint32ToRgba, 
  uint32ToHex, 
  blendUint32, 
  uint32ToCssRgba 
} from '../color';

describe('Color utilities (32-bit Little-Endian ABGR in memory)', () => {
  it('converts RGBA components to packed 32-bit integer and back', () => {
    // Red: R=255, G=0, B=0, A=255 -> 0xFF0000FF
    const redPacked = rgbaToUint32(255, 0, 0, 255);
    expect(redPacked).toBe(0xFF0000FF >>> 0);

    const [r, g, b, a] = uint32ToRgba(redPacked);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
    expect(a).toBe(255);
  });

  it('converts 6-digit and 3-digit hex strings accurately to uint32', () => {
    const fullHex = hexToUint32('#00FF00'); // Green
    const [r1, g1, b1, a1] = uint32ToRgba(fullHex);
    expect(r1).toBe(0);
    expect(g1).toBe(255);
    expect(b1).toBe(0);
    expect(a1).toBe(255);

    const shortHex = hexToUint32('#0F0'); // Shorthand green
    expect(shortHex).toBe(fullHex);
  });

  it('formats uint32 to hex string', () => {
    const color = hexToUint32('#3178C6');
    expect(uint32ToHex(color).toLowerCase()).toBe('#3178c6');
  });

  it('formats uint32 to CSS rgba string', () => {
    const color = rgbaToUint32(100, 150, 200, 255);
    expect(uint32ToCssRgba(color)).toBe('rgba(100, 150, 200, 1.00)');
  });

  it('correctly blends foreground over background with alpha transparency', () => {
    const bgBlack = rgbaToUint32(0, 0, 0, 255);
    const fgWhite = rgbaToUint32(255, 255, 255, 255);

    // 50% opacity blend
    const blended = blendUint32(bgBlack, fgWhite, 0.5);
    const [r, g, b, a] = uint32ToRgba(blended);

    // ~128 grey
    expect(r).toBeGreaterThanOrEqual(127);
    expect(r).toBeLessThanOrEqual(128);
    expect(g).toBeGreaterThanOrEqual(127);
    expect(g).toBeLessThanOrEqual(128);
    expect(b).toBeGreaterThanOrEqual(127);
    expect(b).toBeLessThanOrEqual(128);
    expect(a).toBe(255);

    // 0% opacity should return exact bg
    expect(blendUint32(bgBlack, fgWhite, 0)).toBe(bgBlack);

    // 100% opacity should return exact fg
    expect(blendUint32(bgBlack, fgWhite, 1)).toBe(fgWhite);
  });
});
