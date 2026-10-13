import { describe, it, expect } from 'vitest';
import { parseHexPalette, parseGplPalette } from '../palette-importer';

describe('Palette importer parsers (.hex and .gpl)', () => {
  it('parses Lospec hex string into unique uppercase colors with # prefix', () => {
    const raw = `
      000000
      ffffff
      #ff004d
      000000
    `;

    const pal = parseHexPalette(raw, 'Test Palette');
    expect(pal.name).toBe('Test Palette');
    expect(pal.colors).toEqual(['#000000', '#FFFFFF', '#FF004D']);
  });

  it('throws an error if no valid hex colors exist', () => {
    expect(() => parseHexPalette('not a color', 'Invalid')).toThrow();
  });

  it('parses GIMP/Aseprite .gpl palette file correctly', () => {
    const gplContent = `GIMP Palette
Name: Retro 4
Columns: 4
#
  0   0   0 Black
255 255 255 White
 50 100 150 Blueish
`;

    const pal = parseGplPalette(gplContent);
    expect(pal.name).toBe('Retro 4');
    expect(pal.colors.length).toBe(3);
    expect(pal.colors[0]).toBe('#000000');
    expect(pal.colors[1]).toBe('#FFFFFF');
    expect(pal.colors[2]).toBe('#326496');
  });
});
