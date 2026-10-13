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
});
