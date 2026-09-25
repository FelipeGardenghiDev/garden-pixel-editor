import type { Point } from './types';

/**
 * Snaps a target point (x1, y1) relative to anchor (x0, y0) to the nearest
 * 2:1 isometric axis (slope +0.5, slope -0.5, or vertical).
 */
export function snapToIsometricAxis(x0: number, y0: number, x1: number, y1: number): Point {
  const dx = x1 - x0;
  const dy = y1 - y0;

  if (dx === 0 && dy === 0) return { x: x0, y: y0 };

  // Calculate distances to 3 primary axes:
  // 1. Vertical axis (dx = 0)
  // 2. Iso X axis (dy = dx * 0.5 -> 2*dy - dx = 0)
  // 3. Iso Y axis (dy = -dx * 0.5 -> 2*dy + dx = 0)

  // Axis 1: Vertical
  const vertX = x0;
  const vertY = y1;
  const distVert = Math.abs(dx);

  // Axis 2: Down-Right / Up-Left (Slope +0.5)
  // Step count along (2, 1)
  const stepX = Math.round((dx + 2 * dy) / 4);
  const isoX_x = x0 + stepX * 2;
  const isoX_y = y0 + stepX;
  const distIsoX = Math.hypot(x1 - isoX_x, y1 - isoX_y);

  // Axis 3: Down-Left / Up-Right (Slope -0.5)
  // Step count along (-2, 1)
  const stepY = Math.round((-dx + 2 * dy) / 4);
  const isoY_x = x0 - stepY * 2;
  const isoY_y = y0 + stepY;
  const distIsoY = Math.hypot(x1 - isoY_x, y1 - isoY_y);

  // Pick closest
  if (distVert <= distIsoX && distVert <= distIsoY) {
    return { x: vertX, y: vertY };
  } else if (distIsoX <= distIsoY) {
    return { x: isoX_x, y: isoX_y };
  } else {
    return { x: isoY_x, y: isoY_y };
  }
}

/**
 * Snaps to 45 degree ortho axes (horizontal, vertical, diagonal).
 */
export function snapToOrthoAxis(x0: number, y0: number, x1: number, y1: number): Point {
  const dx = x1 - x0;
  const dy = y1 - y0;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Horizontal
  if (absDy < absDx * 0.4) {
    return { x: x1, y: y0 };
  }
  // Vertical
  if (absDx < absDy * 0.4) {
    return { x: x0, y: y1 };
  }
  // 45-degree diagonal
  const signX = Math.sign(dx) || 1;
  const signY = Math.sign(dy) || 1;
  const diag = Math.round((absDx + absDy) / 2);
  return { x: x0 + signX * diag, y: y0 + signY * diag };
}

/**
 * Modulo wrap for seamless tile coordinates.
 */
export function wrapCoordinate(val: number, max: number): number {
  return ((val % max) + max) % max;
}
