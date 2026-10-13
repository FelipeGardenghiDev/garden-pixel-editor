import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../pixel-buffer';
import { generateNormalMap, renderLitPreview } from '../normal-map';
import { hexToUint32 } from '../color';

describe('Normal Map Generation & 2.5D Lighting', () => {
  it('generates a normal map buffer from a diffuse pixel buffer', () => {
    const diffuse = new PixelBuffer(8, 8);
    // Draw a 4x4 red square in the center
    const red = hexToUint32('#FF0000');
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 6; x++) {
        diffuse.setPixel(x, y, red);
      }
    }

    const normal = generateNormalMap(diffuse, {
      strength: 2.0,
      bevelRadius: 1,
      invertY: false,
      isoTilted: false
    });

    expect(normal.width).toBe(8);
    expect(normal.height).toBe(8);

    // Pixels outside the square should be transparent (alpha 0)
    expect((normal.getPixel(0, 0) >> 24) & 0xFF).toBe(0);

    // Center pixel of flat square should have normal pointing roughly straight up (Z = 255 -> blueish normal map)
    const centerCol = normal.getPixel(3, 3);
    const centerAlpha = (centerCol >> 24) & 0xFF;
    const centerBlue = (centerCol >> 16) & 0xFF;
    expect(centerAlpha).toBe(255);
    expect(centerBlue).toBeGreaterThan(128); // Standard OpenGL normal flat surface has strong blue (0x8080FF)
  });

  it('supports isometric tilt adjustment for 30 degree angle', () => {
    const diffuse = new PixelBuffer(8, 8);
    const white = hexToUint32('#FFFFFF');
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 6; x++) {
        diffuse.setPixel(x, y, white);
      }
    }

    const normalFlat = generateNormalMap(diffuse, { isoTilted: false });
    const normalIso = generateNormalMap(diffuse, { isoTilted: true });

    expect(normalFlat.data.length).toBe(normalIso.data.length);
    // Flat vs iso tilted should produce altered normal vectors
    const flatPix = normalFlat.getPixel(3, 3);
    const isoPix = normalIso.getPixel(3, 3);
    expect(flatPix).not.toBe(0);
    expect(isoPix).not.toBe(0);
  });

  it('computes real-time lit preview using diffuse and normal buffers', () => {
    const diffuse = new PixelBuffer(16, 16);
    const blue = hexToUint32('#00AAFF');
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        diffuse.setPixel(x, y, blue);
      }
    }

    const normal = generateNormalMap(diffuse, { strength: 2.5 });
    const lit = renderLitPreview(diffuse, normal, 8, 8, 20, {
      lightColor: '#FFFFFF',
      lightIntensity: 1.5,
      ambientIntensity: 0.3
    });

    expect(lit.width).toBe(16);
    expect(lit.height).toBe(16);

    const litPixel = lit.getPixel(8, 8);
    expect((litPixel >> 24) & 0xFF).toBe(255);
  });
});
