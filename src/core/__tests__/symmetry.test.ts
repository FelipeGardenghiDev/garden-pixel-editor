import { describe, it, expect, beforeEach } from 'vitest';
import { EditorEngine } from '../editor-engine';

describe('Symmetry Drawing Engine', () => {
  let engine: EditorEngine;

  beforeEach(() => {
    engine = new EditorEngine(10, 10);
  });

  it('should toggle symmetryX and symmetryY correctly', () => {
    expect(engine.symmetryX).toBe(false);
    expect(engine.symmetryY).toBe(false);

    engine.toggleSymmetryX();
    expect(engine.symmetryX).toBe(true);

    engine.toggleSymmetryY();
    expect(engine.symmetryY).toBe(true);

    engine.toggleSymmetryX();
    expect(engine.symmetryX).toBe(false);
  });

  it('should paint mirrored pixels horizontally when symmetryX is active', () => {
    engine.symmetryX = true;
    engine.symmetryY = false;
    const activeLayer = engine.document.getActiveLayer()!;
    const red = 0xff0000ff; // Red

    // Paint at (1, 2) in a 10x10 canvas -> mirror X is 10 - 1 - 1 = 8 -> (8, 2)
    engine.paintPixel(activeLayer, 1, 2, red);

    const buf = activeLayer.buffer;
    expect(buf[2 * 10 + 1]).toBe(red);
    expect(buf[2 * 10 + 8]).toBe(red);
    // Intermediate pixels remain empty (0)
    expect(buf[2 * 10 + 2]).toBe(0);
    expect(buf[2 * 10 + 7]).toBe(0);
  });

  it('should paint mirrored pixels vertically when symmetryY is active', () => {
    engine.symmetryX = false;
    engine.symmetryY = true;
    const activeLayer = engine.document.getActiveLayer()!;
    const blue = 0xffff0000; // Blue

    // Paint at (3, 1) in a 10x10 canvas -> mirror Y is 10 - 1 - 1 = 8 -> (3, 8)
    engine.paintPixel(activeLayer, 3, 1, blue);

    const buf = activeLayer.buffer;
    expect(buf[1 * 10 + 3]).toBe(blue);
    expect(buf[8 * 10 + 3]).toBe(blue);
    // Other rows empty
    expect(buf[2 * 10 + 3]).toBe(0);
  });

  it('should paint 4 mirrored pixels when both symmetryX and symmetryY are active', () => {
    engine.symmetryX = true;
    engine.symmetryY = true;
    const activeLayer = engine.document.getActiveLayer()!;
    const green = 0xff00ff00; // Green

    // Paint at (2, 3) in a 10x10 canvas:
    // (2, 3), (7, 3), (2, 6), (7, 6)
    engine.paintPixel(activeLayer, 2, 3, green);

    const buf = activeLayer.buffer;
    expect(buf[3 * 10 + 2]).toBe(green);
    expect(buf[3 * 10 + 7]).toBe(green);
    expect(buf[6 * 10 + 2]).toBe(green);
    expect(buf[6 * 10 + 7]).toBe(green);
  });
});
