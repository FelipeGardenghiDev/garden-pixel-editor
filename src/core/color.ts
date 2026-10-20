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

/**
 * Advanced blend modes between background and foreground colors.
 */
export function blendWithModeUint32(
  bg: number,
  fg: number,
  mode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' = 'normal',
  fgOpacity: number = 1
): number {
  if (mode === 'normal') {
    return blendUint32(bg, fg, fgOpacity);
  }

  const [fgR, fgG, fgB, fgA_raw] = uint32ToRgba(fg);
  const fgA = (fgA_raw / 255) * fgOpacity;
  if (fgA <= 0) return bg;

  const [bgR, bgG, bgB, bgA_raw] = uint32ToRgba(bg);
  if (bgA_raw === 0) return fg;

  let blendedR = fgR;
  let blendedG = fgG;
  let blendedB = fgB;

  switch (mode) {
    case 'multiply':
      blendedR = Math.round((bgR * fgR) / 255);
      blendedG = Math.round((bgG * fgG) / 255);
      blendedB = Math.round((bgB * fgB) / 255);
      break;
    case 'screen':
      blendedR = Math.round(255 - ((255 - bgR) * (255 - fgR)) / 255);
      blendedG = Math.round(255 - ((255 - bgG) * (255 - fgG)) / 255);
      blendedB = Math.round(255 - ((255 - bgB) * (255 - fgB)) / 255);
      break;
    case 'overlay': {
      const calcOverlay = (b: number, f: number) =>
        b < 128 ? Math.round((2 * b * f) / 255) : Math.round(255 - (2 * (255 - b) * (255 - f)) / 255);
      blendedR = calcOverlay(bgR, fgR);
      blendedG = calcOverlay(bgG, fgG);
      blendedB = calcOverlay(bgB, fgB);
      break;
    }
    case 'darken':
      blendedR = Math.min(bgR, fgR);
      blendedG = Math.min(bgG, fgG);
      blendedB = Math.min(bgB, fgB);
      break;
    case 'lighten':
      blendedR = Math.max(bgR, fgR);
      blendedG = Math.max(bgG, fgG);
      blendedB = Math.max(bgB, fgB);
      break;
    case 'color-dodge': {
      const calcDodge = (b: number, f: number) =>
        f === 255 ? 255 : Math.min(255, Math.round((b * 255) / (255 - f)));
      blendedR = calcDodge(bgR, fgR);
      blendedG = calcDodge(bgG, fgG);
      blendedB = calcDodge(bgB, fgB);
      break;
    }
  }

  const finalFg = rgbaToUint32(blendedR, blendedG, blendedB, fgA_raw);
  return blendUint32(bg, finalFg, fgOpacity);
}
