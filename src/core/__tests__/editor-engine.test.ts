import { describe, it, expect } from 'vitest';
import { EditorEngine } from '../editor-engine';

describe('EditorEngine Core Features', () => {
  it('initializes with grids turned off by default', () => {
    const engine = new EditorEngine(32, 32);
    expect(engine.showPixelGrid).toBe(false);
    expect(engine.showIsoGrid).toBe(false);
  });

  it('manages primary and secondary colors and swaps them cleanly', () => {
    const engine = new EditorEngine(32, 32);
    engine.setColor('#123456');
    engine.setSecondaryColor('#AABBCC');

    expect(engine.primaryColor.toUpperCase()).toBe('#123456');
    expect(engine.secondaryColor.toUpperCase()).toBe('#AABBCC');

    // Swap colors
    engine.swapColors();
    expect(engine.primaryColor.toUpperCase()).toBe('#AABBCC');
    expect(engine.secondaryColor.toUpperCase()).toBe('#123456');
  });

  it('sets color for active slot', () => {
    const engine = new EditorEngine(32, 32);
    engine.setActiveColorSlot('secondary');
    engine.setColorForActiveSlot('#334455');
    expect(engine.secondaryColor.toUpperCase()).toBe('#334455');

    engine.setActiveColorSlot('primary');
    engine.setColorForActiveSlot('#998877');
    expect(engine.primaryColor.toUpperCase()).toBe('#998877');
  });

  it('toggles grids and symmetry', () => {
    const engine = new EditorEngine(32, 32);
    expect(engine.showPixelGrid).toBe(false);
    engine.togglePixelGrid();
    expect(engine.showPixelGrid).toBe(true);

    expect(engine.showIsoGrid).toBe(false);
    engine.toggleIsoGrid();
    expect(engine.showIsoGrid).toBe(true);

    expect(engine.symmetryX).toBe(false);
    engine.toggleSymmetryX();
    expect(engine.symmetryX).toBe(true);
  });
});
