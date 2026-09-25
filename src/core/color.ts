/**
 * Color utilities for 32-bit packed pixel representation in Little-Endian (ABGR in memory = RGBA).
 */

export function rgbaToUint32(r: number, g: number, b: number, a: number = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function hexToUint32(hex: string, alpha: number = 255): number {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  return rgbaToUint32(r, g, b, alpha);
}

export function uint32ToRgba(val: number): [number, number, number, number] {
  const r = val & 0xFF;
  const g = (val >> 8) & 0xFF;
  const b = (val >> 16) & 0xFF;
  const a = (val >> 24) & 0xFF;
  return [r, g, b, a];
}

export function uint32ToHex(val: number): string {
  const [r, g, b] = uint32ToRgba(val);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function uint32ToCssRgba(val: number): string {
  const [r, g, b, a] = uint32ToRgba(val);
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
}

/**
 * Normal alpha blend of foreground color over background color.
 */
export function blendUint32(bg: number, fg: number, fgOpacity: number = 1): number {
  const [fgR, fgG, fgB, fgA_raw] = uint32ToRgba(fg);
  const fgA = (fgA_raw / 255) * fgOpacity;
  if (fgA <= 0) return bg;
  if (fgA >= 1) return fg;

  const [bgR, bgG, bgB, bgA_raw] = uint32ToRgba(bg);
  const bgA = bgA_raw / 255;

  const outA = fgA + bgA * (1 - fgA);
  if (outA <= 0) return 0;

  const outR = Math.round((fgR * fgA + bgR * bgA * (1 - fgA)) / outA);
  const outG = Math.round((fgG * fgA + bgG * bgA * (1 - fgA)) / outA);
  const outB = Math.round((fgB * fgA + bgB * bgA * (1 - fgA)) / outA);

  return rgbaToUint32(outR, outG, outB, Math.round(outA * 255));
}
