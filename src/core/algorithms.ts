import type { Point, Rect } from './types';
import { PixelBuffer } from './pixel-buffer';
import { uint32ToRgba, rgbaToUint32 } from './color';

/**
 * Standard Bresenham line rasterization.
 */
export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plot: (x: number, y: number) => void
): void {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let curX = x0;
  let curY = y0;

  while (true) {
    plot(curX, curY);
    if (curX === x1 && curY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      curX += sx;
    }
    if (e2 < dx) {
      err += dx;
      curY += sy;
    }
  }
}

/**
 * Rasterizes an unfilled or filled rectangle.
 */
export function drawRectOutline(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plot: (x: number, y: number) => void
): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  for (let x = minX; x <= maxX; x++) {
    plot(x, minY);
    plot(x, maxY);
  }
  for (let y = minY + 1; y < maxY; y++) {
    plot(minX, y);
    plot(maxX, y);
  }
}

/**
 * High-performance 4-way Flood Fill using a stack.
 */
export function floodFill(
  buffer: PixelBuffer,
  startX: number,
  startY: number,
  fillColor: number
): Rect | null {
  if (startX < 0 || startX >= buffer.width || startY < 0 || startY >= buffer.height) {
    return null;
  }

  const targetColor = buffer.getPixel(startX, startY);
  if (targetColor === fillColor) return null;

  const stack: Point[] = [{ x: startX, y: startY }];
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  const width = buffer.width;
  const height = buffer.height;
  const data = buffer.data;

  while (stack.length > 0) {
    const pt = stack.pop()!;
    let { x, y } = pt;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (data[idx] !== targetColor) continue;

    // Scan left
    let leftX = x;
    while (leftX > 0 && data[y * width + (leftX - 1)] === targetColor) {
      leftX--;
    }

    // Scan right
    let rightX = x;
    while (rightX < width - 1 && data[y * width + (rightX + 1)] === targetColor) {
      rightX++;
    }

    minX = Math.min(minX, leftX);
    maxX = Math.max(maxX, rightX);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Fill the horizontal segment
    for (let c = leftX; c <= rightX; c++) {
      data[y * width + c] = fillColor;

      // Check rows above and below
      if (y > 0 && data[(y - 1) * width + c] === targetColor) {
        stack.push({ x: c, y: y - 1 });
      }
      if (y < height - 1 && data[(y + 1) * width + c] === targetColor) {
        stack.push({ x: c, y: y + 1 });
      }
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Creates shaded variants for left (shadow) and right (reflected light) faces of an isometric prism.
 */
export function deriveIsoShades(baseColor: number): { top: number; left: number; right: number } {
  const [r, g, b, a] = uint32ToRgba(baseColor);

  // Left face: in slight shadow (80% brightness)
  const left = rgbaToUint32(Math.round(r * 0.78), Math.round(g * 0.78), Math.round(b * 0.78), a);

  // Right face: deeper shadow (58% brightness)
  const right = rgbaToUint32(Math.round(r * 0.58), Math.round(g * 0.58), Math.round(b * 0.58), a);

  return { top: baseColor, left, right };
}

/**
 * Renders an Isometric Box/Cube primitive directly in pixel art.
 * origin is the TOP apex vertex of the box.
 * wTiles: steps along +X (down-right)
 * dTiles: steps along +Y (down-left)
 * hPixels: vertical height in pixels
 */
export function drawIsoCube(
  topApex: Point,
  wSteps: number,
  dSteps: number,
  hPixels: number,
  topColor: number,
  leftColor: number,
  rightColor: number,
  plot: (x: number, y: number, color: number) => void
): Rect {
  const x0 = topApex.x;
  const y0 = topApex.y;

  // 4 corners of top diamond face:
  // Apex (top)
  const topX = x0;
  const topY = y0;

  // Right corner (along +X: +2x, +1y per step)
  const rightX = x0 + wSteps * 2;
  const rightY = y0 + wSteps;

  // Left corner (along +Y: -2x, +1y per step)
  const leftX = x0 - dSteps * 2;
  const leftY = y0 + dSteps;

  // Bottom corner of top face
  const botX = x0 + (wSteps - dSteps) * 2;
  const botY = y0 + (wSteps + dSteps);

  let minX = Math.min(topX, rightX, leftX, botX);
  let maxX = Math.max(topX, rightX, leftX, botX);
  let minY = topY;
  let maxY = botY + hPixels;

  // 1. Draw Top Face lines & fill
  // Fill scanlines of top diamond
  const topLines: Map<number, { minX: number; maxX: number }> = new Map();
  const registerTopPoint = (x: number, y: number) => {
    const cur = topLines.get(y);
    if (!cur) {
      topLines.set(y, { minX: x, maxX: x });
    } else {
      cur.minX = Math.min(cur.minX, x);
      cur.maxX = Math.max(cur.maxX, x);
    }
  };

  bresenhamLine(topX, topY, rightX, rightY, registerTopPoint);
  bresenhamLine(rightX, rightY, botX, botY, registerTopPoint);
  bresenhamLine(botX, botY, leftX, leftY, registerTopPoint);
  bresenhamLine(leftX, leftY, topX, topY, registerTopPoint);

  topLines.forEach((span, y) => {
    for (let x = span.minX; x <= span.maxX; x++) {
      plot(x, y, topColor);
    }
  });

  // 2. Draw Left Face (from left-side of diamond down to height)
  // Left side boundary: from leftX, leftY to botX, botY
  bresenhamLine(leftX, leftY, botX, botY, (x, y) => {
    for (let h = 1; h <= hPixels; h++) {
      plot(x, y + h, leftColor);
    }
  });

  // 3. Draw Right Face (from botX, botY to rightX, rightY)
  bresenhamLine(botX, botY, rightX, rightY, (x, y) => {
    for (let h = 1; h <= hPixels; h++) {
      plot(x, y + h, rightColor);
    }
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
