import type { Palette } from './types';

/**
 * Parses Lospec / text hex files (one hex code per line or whitespace/comma separated).
 */
export function parseHexPalette(content: string, name: string = 'Paleta Importada'): Palette {
  const hexRegex = /#?([0-9a-fA-F]{6})/g;
  const matches = content.match(hexRegex);

  if (!matches || matches.length === 0) {
    throw new Error('Nenhuma cor hexadecimal válida encontrada no arquivo.');
  }

  // Deduplicate preserving order and prefix with '#'
  const uniqueColors: string[] = [];
  for (const match of matches) {
    const formatted = '#' + match.replace('#', '').toUpperCase();
    if (!uniqueColors.includes(formatted)) {
      uniqueColors.push(formatted);
    }
  }

  return {
    id: `custom-palette-${Date.now()}`,
    name,
    colors: uniqueColors
  };
}

/**
 * Parses GIMP / Aseprite .gpl palette files.
 */
export function parseGplPalette(content: string, defaultName: string = 'Paleta GPL'): Palette {
  const lines = content.split(/\r?\n/);
  let paletteName = defaultName;
  const colors: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.toLowerCase().startsWith('name:')) {
      const namePart = line.substring(5).trim();
      if (namePart) paletteName = namePart;
      continue;
    }

    // Skip comments or headers
    if (line.startsWith('#') || line.toLowerCase().startsWith('gimp palette') || line.toLowerCase().startsWith('columns:')) {
      continue;
    }

    // Line should contain: R G B [Name]
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseInt(parts[0], 10);
      const g = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b) && r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        if (!colors.includes(hex)) {
          colors.push(hex);
        }
      }
    }
  }

  if (colors.length === 0) {
    throw new Error('Nenhuma cor válida encontrada no formato GPL.');
  }

  return {
    id: `custom-palette-${Date.now()}`,
    name: paletteName,
    colors
  };
}

/**
 * Extracts unique colors from an uploaded image file (PNG, JPG, WebP),
 * ranked by frequency up to maxColors.
 */
export async function extractPaletteFromImage(
  file: File,
  maxColors: number = 32
): Promise<Palette> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDimension = 256; // Scale down very large images for ultra-fast sampling
          let w = img.width;
          let h = img.height;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Falha ao inicializar contexto 2D do Canvas.'));
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h).data;

          const colorCounts = new Map<string, number>();

          for (let i = 0; i < imgData.length; i += 4) {
            const a = imgData[i + 3];
            if (a < 64) continue; // Ignore transparent/near-transparent pixels

            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();

            colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
          }

          if (colorCounts.size === 0) {
            reject(new Error('Nenhum pixel visível encontrado na imagem.'));
            return;
          }

          // Sort by frequency descending
          const sorted = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([hex]) => hex);

          const fileNameNoExt = file.name.replace(/\.[^/.]+$/, '');
          resolve({
            id: `custom-palette-${Date.now()}`,
            name: `${fileNameNoExt} (${sorted.length} cores)`,
            colors: sorted
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Triggers browser download of palette as Lospec .hex format.
 */
export function exportPaletteToHex(palette: Palette): void {
  const lines = palette.colors.map(c => c.replace('#', '').toLowerCase());
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${palette.name.toLowerCase().replace(/\s+/g, '_')}.hex`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser download of palette as standard GIMP .gpl format.
 */
export function exportPaletteToGpl(palette: Palette): void {
  const lines: string[] = [
    'GIMP Palette',
    `Name: ${palette.name}`,
    'Columns: 8',
    '#'
  ];

  for (const hex of palette.colors) {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    lines.push(`${r.toString().padStart(3, ' ')} ${g.toString().padStart(3, ' ')} ${b.toString().padStart(3, ' ')}  ${hex}`);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${palette.name.toLowerCase().replace(/\s+/g, '_')}.gpl`;
  a.click();
  URL.revokeObjectURL(url);
}
