import { describe, it, expect } from 'vitest';
import { 
  bresenhamLine, 
  drawRectOutline, 
  floodFill, 
  deriveIsoShades, 
  isDitherPixel,
  filterPixelPerfect
} from '../algorithms';
import { PixelBuffer } from '../pixel-buffer';
import { hexToUint32, uint32ToRgba } from '../color';
import type { Point } from '../types';

describe('Graphics algorithms & rasterization', () => {
  it('bresenhamLine plots a continuous line between two endpoints', () => {
    const points: Point[] = [];
    bresenhamLine(0, 0, 4, 4, (x, y) => {
      points.push({ x, y });
    });

    // Diagonal from 0,0 to 4,4 should have 5 points
    expect(points.length).toBe(5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[4]).toEqual({ x: 4, y: 4 });
  });

  it('drawRectOutline generates exact rectangular boundary', () => {
    const points: Point[] = [];
    drawRectOutline(0, 0, 2, 2, (x, y) => {
      points.push({ x, y });
    });

    // 3x3 perimeter has 8 pixels
    expect(points.length).toBe(8);
  });

  it('floodFill fills contiguous region and stops at borders', () => {
    const buffer = new PixelBuffer(8, 8);
    const borderColor = 0xFF0000FF; // Red
    const fillColor = 0xFF00FF00;   // Green

    // Draw a 4x4 box boundary inside the 8x8 buffer
    drawRectOutline(1, 1, 4, 4, (x, y) => {
      buffer.setPixel(x, y, borderColor);
    });

    // Fill interior at (2, 2)
    const dirtyRect = floodFill(buffer, 2, 2, fillColor);
    expect(dirtyRect).not.toBeNull();

    // The interior pixels (2,2), (2,3), (3,2), (3,3) must be fillColor
    expect(buffer.getPixel(2, 2)).toBe(fillColor);
    expect(buffer.getPixel(3, 3)).toBe(fillColor);

    // The border must remain borderColor
    expect(buffer.getPixel(1, 1)).toBe(borderColor);
    expect(buffer.getPixel(4, 4)).toBe(borderColor);

    // Pixels outside the border must remain 0
    expect(buffer.getPixel(0, 0)).toBe(0);
    expect(buffer.getPixel(5, 5)).toBe(0);
  });

  it('deriveIsoShades generates top, left, right shades from base uint32 color', () => {
    const baseColor = hexToUint32('#4A90E2');
    const shades = deriveIsoShades(baseColor);

    expect(shades.top).toBe(baseColor);

    const [topR, topG, topB] = uint32ToRgba(shades.top);
    const [leftR, leftG, leftB] = uint32ToRgba(shades.left);
    const [rightR, rightG, rightB] = uint32ToRgba(shades.right);

    // Left should be darker than top (~78%)
    expect(leftR).toBeLessThanOrEqual(topR);
    expect(leftG).toBeLessThanOrEqual(topG);
    expect(leftB).toBeLessThanOrEqual(topB);

    // Right should be darker than left (~58%)
    expect(rightR).toBeLessThanOrEqual(leftR);
    expect(rightG).toBeLessThanOrEqual(leftG);
    expect(rightB).toBeLessThanOrEqual(leftB);
  });

  it('isDitherPixel handles checker, sparse and bayer patterns with (x, y, mode)', () => {
    expect(isDitherPixel(0, 0, 'none')).toBe(true);

    // Checker: ((x + y) & 1) === 0
    expect(isDitherPixel(0, 0, 'checker')).toBe(true);
    expect(isDitherPixel(1, 0, 'checker')).toBe(false);
    expect(isDitherPixel(1, 1, 'checker')).toBe(true);

    // Sparse: (x % 2 === 0 && y % 2 === 0)
    expect(isDitherPixel(0, 0, 'sparse')).toBe(true);
    expect(isDitherPixel(1, 0, 'sparse')).toBe(false);
    expect(isDitherPixel(0, 1, 'sparse')).toBe(false);
    expect(isDitherPixel(2, 2, 'sparse')).toBe(true);

    // Bayer 2x2
    expect(isDitherPixel(0, 0, 'bayer')).toBe(true);
  });

  it('filterPixelPerfect removes redundant L-corner pixels', () => {
    // 3 points in an L-shape: (0,0) -> (1,0) -> (1,1)
    // Diagonally touching endpoints (0,0) and (1,1) have dx=1, dy=1
    // The middle pixel (1,0) is redundant and should be filtered out
    const stroke: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 }
    ];

    const filtered = filterPixelPerfect(stroke);
    expect(filtered.length).toBe(2);
    expect(filtered[0]).toEqual({ x: 0, y: 0 });
    expect(filtered[1]).toEqual({ x: 1, y: 1 });
  });
});
