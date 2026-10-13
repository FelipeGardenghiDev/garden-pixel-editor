import { describe, it, expect } from 'vitest';
import { PixelDocument } from '../document';

describe('PixelDocument (Multi-frame & layer hierarchy with compositing)', () => {
  it('initializes with default layer, frame and palette', () => {
    const doc = new PixelDocument(32, 32);
    expect(doc.width).toBe(32);
    expect(doc.height).toBe(32);
    expect(doc.frames.length).toBe(1);
    expect(doc.layers.length).toBe(1);
    expect(doc.activeLayerId).toBe(doc.layers[0].id);
  });

  it('adds, duplicates and deletes layers maintaining valid active layer', () => {
    const doc = new PixelDocument(16, 16);
    const layer1 = doc.layers[0];

    const layer2 = doc.addLayer('Details');
    expect(doc.layers.length).toBe(2);
    expect(doc.activeLayerId).toBe(layer2.id);

    // Toggle visibility
    doc.toggleLayerVisibility(layer2.id);
    expect(layer2.visible).toBe(false);

    // Delete active layer
    const deleted = doc.deleteLayer(layer2.id);
    expect(deleted).toBe(true);
    expect(doc.layers.length).toBe(1);
    expect(doc.activeLayerId).toBe(layer1.id);

    // Deleting the last remaining layer should be blocked
    expect(doc.deleteLayer(layer1.id)).toBe(false);
  });

  it('manages animation frames correctly', () => {
    const doc = new PixelDocument(16, 16);
    expect(doc.frames.length).toBe(1);

    const frame2 = doc.addFrame();
    expect(frame2.id).toBeTruthy();
    expect(doc.frames.length).toBe(2);
    expect(doc.activeFrameIndex).toBe(1);

    const frame3 = doc.duplicateFrame(1);
    expect(doc.frames.length).toBe(3);
    expect(frame3.name).toContain('(Cópia)');

    const deleted = doc.deleteFrame(1);
    expect(deleted).toBe(true);
    expect(doc.frames.length).toBe(2);
  });

  it('composites visible layers in order with alpha blending', () => {
    const doc = new PixelDocument(4, 4);
    const layerBottom = doc.layers[0];
    const red = 0xFF0000FF;
    const blue = 0xFFFF0000;

    // Bottom layer: all red
    layerBottom.buffer.fill(red);

    // Top layer: blue pixel at (0, 0)
    const layerTop = doc.addLayer('Top');
    layerTop.buffer[0] = blue;

    const compositeBuffer = doc.composite();
    // (0, 0) should be blue (top layer)
    expect(compositeBuffer.getPixel(0, 0)).toBe(blue);
    // (1, 1) should be red (bottom layer shows through transparent top)
    expect(compositeBuffer.getPixel(1, 1)).toBe(red);

    // If top layer is invisible, bottom layer shows
    doc.toggleLayerVisibility(layerTop.id);
    const hiddenComposite = doc.composite();
    expect(hiddenComposite.getPixel(0, 0)).toBe(red);
  });

  it('reorders frames via moveFrame', () => {
    const doc = new PixelDocument(4, 4);
    const frame1 = doc.frames[0];
    frame1.name = 'First';

    const frame2 = doc.addFrame();
    frame2.name = 'Second';

    const frame3 = doc.addFrame();
    frame3.name = 'Third';

    expect(doc.frames.map(f => f.name)).toEqual(['First', 'Second', 'Third']);

    // Move frame 0 to index 2
    const moved = doc.moveFrame(0, 2);
    expect(moved).toBe(true);
    expect(doc.frames.map(f => f.name)).toEqual(['Second', 'Third', 'First']);
    expect(doc.activeFrameIndex).toBe(2);
  });

  it('resizes canvas preserving existing pixels with anchor', () => {
    const doc = new PixelDocument(4, 4);
    const gold = 0xFFFFD700;
    doc.layers[0].buffer[0] = gold; // pixel at (0, 0)

    // Resize to 8x8 with top-left anchor
    doc.resizeCanvas(8, 8, 'top-left');
    expect(doc.width).toBe(8);
    expect(doc.height).toBe(8);
    expect(doc.layers[0].buffer.length).toBe(64);
    expect(doc.layers[0].buffer[0]).toBe(gold); // still at (0, 0)
    expect(doc.layers[0].buffer[63]).toBe(0);

    // Resize to 12x12 with center anchor
    // Offset should be (12-8)/2 = 2
    doc.resizeCanvas(12, 12, 'center');
    expect(doc.width).toBe(12);
    expect(doc.height).toBe(12);
    // Old (0, 0) should now be at (2, 2) -> index 2 * 12 + 2 = 26
    expect(doc.layers[0].buffer[2 * 12 + 2]).toBe(gold);
  });

  it('handles layer duplication, renaming, opacity and reordering', () => {
    const doc = new PixelDocument(4, 4);
    const baseLayer = doc.layers[0];
    baseLayer.buffer[0] = 0xFF112233;

    // Duplicate layer
    const duplicated = doc.duplicateLayer(baseLayer.id);
    expect(duplicated).toBeDefined();
    expect(doc.layers.length).toBe(2);
    expect(duplicated!.buffer[0]).toBe(0xFF112233);
    expect(duplicated!.name).toContain('(Cópia)');

    // Rename
    doc.renameLayer(duplicated!.id, 'Outline');
    expect(duplicated!.name).toBe('Outline');

    // Opacity
    doc.setLayerOpacity(duplicated!.id, 0.5);
    expect(duplicated!.opacity).toBe(0.5);

    // Reorder layers
    expect(doc.layers[0].id).toBe(baseLayer.id);
    expect(doc.layers[1].id).toBe(duplicated!.id);

    doc.moveLayer(0, 1);
    expect(doc.layers[0].id).toBe(duplicated!.id);
    expect(doc.layers[1].id).toBe(baseLayer.id);
  });

  it('merges layer down with alpha blend into the layer below', () => {
    const doc = new PixelDocument(4, 4);
    const bottomLayer = doc.layers[0];
    bottomLayer.buffer.fill(0xFF000000); // Black

    const topLayer = doc.addLayer('Top');
    topLayer.buffer[0] = 0xFFFFFFFF; // White at (0, 0)

    expect(doc.layers.length).toBe(2);

    const merged = doc.mergeLayerDown(topLayer.id);
    expect(merged).toBe(true);
    expect(doc.layers.length).toBe(1);
    expect(doc.layers[0].id).toBe(bottomLayer.id);
    // (0, 0) should be white, rest black
    expect(doc.layers[0].buffer[0]).toBe(0xFFFFFFFF);
    expect(doc.layers[0].buffer[1]).toBe(0xFF000000);
  });
});


