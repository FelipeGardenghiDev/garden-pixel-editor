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

/**
 * Checks if a pixel coordinate is filled under the given DitherMode pattern.
 */
export function isDitherPixel(x: number, y: number, mode: 'none' | 'checker' | 'bayer' | 'sparse'): boolean {
  if (mode === 'none') return true;
  if (mode === 'checker') return ((x + y) & 1) === 0;
  if (mode === 'sparse') return (x % 2 === 0) && (y % 2 === 0);
  if (mode === 'bayer') {
    // 2x2 Bayer threshold
    const bayer2x2 = [
      [0, 2],
      [3, 1]
    ];
    return bayer2x2[((y % 2) + 2) % 2][((x % 2) + 2) % 2] < 3;
  }
  return true;
}

/**
 * Filters out redundant corner pixels to guarantee a 1-pixel-thick clean stroke (Pixel-Perfect).
 */
export function filterPixelPerfect(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const pPrev = result[result.length - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    if (pNext) {
      const dx = Math.abs(pNext.x - pPrev.x);
      const dy = Math.abs(pNext.y - pPrev.y);
      if (dx === 1 && dy === 1) {
        // Redundant corner pixel between diagonally touching neighbors
        continue;
      }
    }
    result.push(pCurr);
  }
  return result;
}

/**
 * Rasterizes a pixel-art ellipse or circle bounding box outline.
 */
export function drawEllipseOutline(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plot: (x: number, y: number) => void
): void {
  let a = Math.abs(x1 - x0);
  let b = Math.abs(y1 - y0);
  let b1 = b & 1;
  let dx = 4 * (1 - a) * b * b;
  let dy = 4 * (b1 + 1) * a * a;
  let err = dx + dy + b1 * a * a;
  let e2: number;

  let curX0 = Math.min(x0, x1);
  let curY0 = Math.min(y0, y1);
  let curX1 = Math.max(x0, x1);
  let curY1 = Math.max(y0, y1);

  curY0 += Math.floor((b + 1) / 2);
  curY1 = curY0 - b1;
  a *= 8 * a;
  b1 = 8 * b * b;

  do {
    plot(curX1, curY0);
    plot(curX0, curY0);
    plot(curX0, curY1);
    plot(curX1, curY1);
    e2 = 2 * err;
    if (e2 <= dy) {
      curY0++;
      curY1--;
      err += dy += a;
    }
    if (e2 >= dx || 2 * err > dy) {
      curX0++;
      curX1--;
      err += dx += b1;
    }
  } while (curX0 <= curX1);

  while (curY0 - curY1 <= b) {
    plot(curX0 - 1, curY0);
    plot(curX1 + 1, curY0++);
    plot(curX0 - 1, curY1);
    plot(curX1 + 1, curY1--);
  }
}

/**
 * Draws a 3D Isometric Cylinder with lighted disk cap and shaded body.
 */
export function drawIsoCylinder(
  centerApex: Point,
  radiusX: number,
  hPixels: number,
  topColor: number,
  leftColor: number,
  rightColor: number,
  plot: (x: number, y: number, color: number) => void
): Rect {
  const cx = centerApex.x;
  const cy = centerApex.y;
  const ry = Math.max(1, Math.round(radiusX * 0.5)); // 2:1 isometric aspect ratio

  const minX = cx - radiusX;
  const maxX = cx + radiusX;
  const minY = cy - ry;
  const maxY = cy + ry + hPixels;

  // 1. Top cap (filled 2:1 ellipse)
  const capSpans: Map<number, { minX: number; maxX: number }> = new Map();
  drawEllipseOutline(cx - radiusX, cy - ry, cx + radiusX, cy + ry, (x, y) => {
    const cur = capSpans.get(y);
    if (!cur) {
      capSpans.set(y, { minX: x, maxX: x });
    } else {
      cur.minX = Math.min(cur.minX, x);
      cur.maxX = Math.max(cur.maxX, x);
    }
  });

  capSpans.forEach((span, y) => {
    for (let x = span.minX; x <= span.maxX; x++) {
      plot(x, y, topColor);
    }
  });

  // 2. Cylinder body walls
  for (let x = cx - radiusX; x <= cx + radiusX; x++) {
    // Normal/shading based on horizontal position across the cylinder
    const col = x < cx ? leftColor : rightColor;
    for (let h = 1; h <= hPixels; h++) {
      plot(x, cy + h, col);
    }
  }

  // 3. Bottom curved contour
  drawEllipseOutline(cx - radiusX, cy - ry + hPixels, cx + radiusX, cy + ry + hPixels, (x, y) => {
    if (y >= cy + hPixels) {
      plot(x, y, leftColor);
    }
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Draws an Isometric Triangular Ramp / Roof primitive.
 */
export function drawIsoRamp(
  apex: Point,
  wSteps: number,
  dSteps: number,
  hPixels: number,
  topColor: number,
  leftColor: number,
  rightColor: number,
  plot: (x: number, y: number, color: number) => void
): Rect {
  const x0 = apex.x;
  const y0 = apex.y;

  // Ridge line from topApex along +X axis (2x, 1y per step)
  const ridgeEndX = x0 + wSteps * 2;
  const ridgeEndY = x0 + wSteps;

  // Sloping down along +Y axis (-2x, 1y per step)
  const leftX = x0 - dSteps * 2;
  const leftY = y0 + dSteps + hPixels;
  const botX = ridgeEndX - dSteps * 2;
  const botY = ridgeEndY + dSteps + hPixels;

  const minX = Math.min(x0, ridgeEndX, leftX, botX);
  const maxX = Math.max(x0, ridgeEndX, leftX, botX);
  const minY = Math.min(y0, ridgeEndY);
  const maxY = Math.max(leftY, botY);

  // Top Ridge
  bresenhamLine(x0, y0, ridgeEndX, ridgeEndY, (x, y) => plot(x, y, topColor));

  // Sloped Left Plane
  bresenhamLine(x0, y0, leftX, leftY, (x, y) => {
    bresenhamLine(x, y, x + wSteps * 2, y + wSteps, (px, py) => {
      plot(px, py, leftColor);
    });
  });

  // Vertical Back / Front Faces
  bresenhamLine(leftX, leftY, botX, botY, (x, y) => plot(x, y, rightColor));

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}
