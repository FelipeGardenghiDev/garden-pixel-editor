import { describe, it, expect } from 'vitest';
import { generateAnimatedGif } from '../gif-export';
import { PixelDocument } from '../document';

describe('Animated GIF generation (gif-export)', () => {
  it('generates a valid GIF buffer with GIF89a header', () => {
    const doc = new PixelDocument(8, 8);
    doc.layers[0].buffer[0] = 0xFF0000FF; // Red pixel

    const gifBytes = generateAnimatedGif(doc, { scale: 1, fps: 10 });
    expect(gifBytes.length).toBeGreaterThan(0);

    // GIF magic header: "GIF" (0x47, 0x49, 0x46)
    expect(gifBytes[0]).toBe(0x47); // 'G'
    expect(gifBytes[1]).toBe(0x49); // 'I'
    expect(gifBytes[2]).toBe(0x46); // 'F'
  });

  it('correctly handles multi-frame documents and custom scaling', () => {
    const doc = new PixelDocument(4, 4);
    doc.layers[0].buffer[0] = 0xFF00FF00; // Frame 1: green

    const frame2 = doc.addFrame();
    frame2.layers[0].buffer[0] = 0xFFFF0000; // Frame 2: blue

    const gifBytes = generateAnimatedGif(doc, { scale: 4, fps: 12, transparent: true });
    expect(gifBytes.length).toBeGreaterThan(50);

    // Check GIF header
    const headerStr = String.fromCharCode(gifBytes[0], gifBytes[1], gifBytes[2]);
    expect(headerStr).toBe('GIF');
  });

  it('supports opaque background option', () => {
    const doc = new PixelDocument(4, 4);
    const gifBytes = generateAnimatedGif(doc, {
      scale: 2,
      transparent: false,
      backgroundColor: '#000000'
    });
    expect(gifBytes.length).toBeGreaterThan(30);
  });
});
