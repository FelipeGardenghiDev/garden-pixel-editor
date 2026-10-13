import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../pixel-buffer';
import { uint32ToCssColor, generateCssBoxShadow, generateSvg } from '../code-export';

describe('Code Export (CSS box-shadow & SVG)', () => {
  it('should format 32-bit colors to CSS hex and rgba', () => {
    // 0xAABBGGRR
    const opaqueRed = 0xff0000ff;
    expect(uint32ToCssColor(opaqueRed)).toBe('#ff0000');

    const halfAlphaGreen = 0x8000ff00; // a=128
    const css = uint32ToCssColor(halfAlphaGreen);
    expect(css).toContain('rgba(0, 255, 0, 0.50)');
  });

  it('should generate valid CSS box-shadow for a pixel buffer', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, 0xff0000ff); // Red at (0, 0)
    buf.setPixel(1, 1, 0xff00ff00); // Green at (1, 1)

    const css = generateCssBoxShadow(buf, 10, 'my-pixel');
    expect(css).toContain('.my-pixel {');
    expect(css).toContain('width: 10px;');
    expect(css).toContain('height: 10px;');
    expect(css).toContain('0px 0px 0 0 #ff0000');
    expect(css).toContain('10px 10px 0 0 #00ff00');
  });

  it('should return empty notice if no pixels are visible in CSS export', () => {
    const emptyBuf = new PixelBuffer(2, 2);
    const css = generateCssBoxShadow(emptyBuf);
    expect(css).toContain('Nenhum pixel visível');
  });

  it('should generate crisp SVG markup with rect elements', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, 0xffffffff); // White

    const svg = generateSvg(buf, 8);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 16 16"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('<rect x="0" y="0" width="8" height="8" fill="#ffffff" />');
  });
});
