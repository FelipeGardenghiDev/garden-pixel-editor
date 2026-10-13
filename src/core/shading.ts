import { PixelBuffer } from './pixel-buffer';
import type { Rect } from './types';
import { uint32ToRgba, rgbaToUint32, hexToUint32, uint32ToHex } from './color';

/**
 * Swaps all occurrences of fromColor32 with toColor32 on the given buffer (or inside rect).
 * Returns the bounding rect of altered pixels, or null if no pixels changed.
 */
export function swapColor(
  buffer: PixelBuffer,
  fromColor32: number,
  toColor32: number,
  rect?: Rect
): Rect | null {
  if (fromColor32 === toColor32) return null;

  const r: Rect = rect || { x: 0, y: 0, width: buffer.width, height: buffer.height };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let y = r.y; y < r.y + r.height; y++) {
    if (y < 0 || y >= buffer.height) continue;
    for (let x = r.x; x < r.x + r.width; x++) {
      if (x < 0 || x >= buffer.width) continue;
      const idx = y * buffer.width + x;
      if (buffer.data[idx] === fromColor32) {
        buffer.data[idx] = toColor32;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX > maxX) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Adjusts color brightness (e.g. delta = -0.15 for shade, +0.15 for highlight).
 */
export function adjustBrightness(color32: number, factor: number): number {
  const [r, g, b, a] = uint32ToRgba(color32);
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return rgbaToUint32(
    clamp(r * factor),
    clamp(g * factor),
    clamp(b * factor),
    a
  );
}

/**
 * Finds the neighboring darker or lighter shade in the active palette.
 */
export function getPaletteShade(
  currentColorHex: string,
  paletteColors: string[],
  direction: 'darker' | 'lighter'
): string {
  if (paletteColors.length === 0) return currentColorHex;

  // Compute luminance for each palette color
  const getLum = (hex: string): number => {
    const [r, g, b] = uint32ToRgba(hexToUint32(hex));
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // Sort unique palette colors by luminance
  const sorted = [...new Set(paletteColors)].sort((a, b) => getLum(a) - getLum(b));
  const currentLum = getLum(currentColorHex);

  if (direction === 'darker') {
    // Find highest luminance color that is darker than current
    const darkerColors = sorted.filter(c => getLum(c) < currentLum - 2);
    if (darkerColors.length > 0) {
      return darkerColors[darkerColors.length - 1];
    }
    // Fallback: programmatic darkening
    return uint32ToHex(adjustBrightness(hexToUint32(currentColorHex), 0.78));
  } else {
    // Find lowest luminance color that is lighter than current
    const lighterColors = sorted.filter(c => getLum(c) > currentLum + 2);
    if (lighterColors.length > 0) {
      return lighterColors[0];
    }
    // Fallback: programmatic brightening
    return uint32ToHex(adjustBrightness(hexToUint32(currentColorHex), 1.25));
  }
}
