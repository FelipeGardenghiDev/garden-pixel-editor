import { describe, it, expect } from 'vitest';
import { PixelDocument } from '../document';
import { buildSpritesheet } from '../spritesheet';
import { hexToUint32 } from '../color';

describe('Spritesheet & Texture Atlas Generator', () => {
  it('builds a horizontal spritesheet from document frames', () => {
    const doc = new PixelDocument(16, 16);
    doc.addFrame(); // 2 frames total
    
    // Draw on frame 0
    const layer0 = doc.frames[0].layers[0];
    layer0.buffer[0] = hexToUint32('#FF0000');

    // Draw on frame 1
    const layer1 = doc.frames[1].layers[0];
    layer1.buffer[0] = hexToUint32('#00FF00');

    const result = buildSpritesheet(doc, {
      source: 'frames',
      layout: 'horizontal',
      padding: 0
    });

    expect(result.buffer.width).toBe(32); // 16 * 2
    expect(result.buffer.height).toBe(16);
    expect(result.frames.length).toBe(2);
    expect(result.atlasJson.meta.app).toBe('Garden Pixel Editor');
    expect(result.atlasJson.frames['Quadro 1']).toBeDefined();
    expect(result.atlasJson.frames['Quadro 2']).toBeDefined();
  });

  it('builds a vertical spritesheet', () => {
    const doc = new PixelDocument(8, 8);
    doc.addFrame();

    const result = buildSpritesheet(doc, {
      source: 'frames',
      layout: 'vertical',
      padding: 2
    });

    // 2 frames of 8px height + 1 padding of 2px between them = 18px height
    expect(result.buffer.width).toBe(8);
    expect(result.buffer.height).toBe(18);
  });

  it('builds a grid layout with specified columns', () => {
    const doc = new PixelDocument(10, 10);
    doc.addFrame();
    doc.addFrame();
    doc.addFrame(); // 4 frames total

    const result = buildSpritesheet(doc, {
      source: 'frames',
      layout: 'grid',
      columns: 2,
      padding: 0
    });

    expect(result.buffer.width).toBe(20); // 2 columns * 10
    expect(result.buffer.height).toBe(20); // 2 rows * 10
    expect(result.frames.length).toBe(4);
  });
});
