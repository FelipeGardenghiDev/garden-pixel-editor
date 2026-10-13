import { PixelBuffer } from './pixel-buffer';

/**
 * Converts a 32-bit little-endian color (0xAABBGGRR) to a CSS color string.
 */
export function uint32ToCssColor(pixel: number): string {
  const r = pixel & 0xff;
  const g = (pixel >>> 8) & 0xff;
  const b = (pixel >>> 16) & 0xff;
  const a = (pixel >>> 24) & 0xff;

  if (a === 255) {
    const rh = r.toString(16).padStart(2, '0');
    const gh = g.toString(16).padStart(2, '0');
    const bh = b.toString(16).padStart(2, '0');
    return `#${rh}${gh}${bh}`;
  }

  const alpha = (a / 255).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates pure CSS box-shadow code for a single <div> element rendering the pixel art.
 */
export function generateCssBoxShadow(
  buffer: PixelBuffer,
  pixelSize: number = 4,
  selectorName: string = 'pixel-art'
): string {
  const shadows: string[] = [];

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const col = buffer.getPixel(x, y);
      const alpha = (col >>> 24) & 0xff;
      if (alpha === 0) continue; // Skip transparent

      const posX = x * pixelSize;
      const posY = y * pixelSize;
      const cssColor = uint32ToCssColor(col);
      shadows.push(`${posX}px ${posY}px 0 0 ${cssColor}`);
    }
  }

  if (shadows.length === 0) {
    return `/* Nenhum pixel visível para exportar */`;
  }

  const css = `.${selectorName} {
  display: inline-block;
  width: ${pixelSize}px;
  height: ${pixelSize}px;
  margin-right: ${(buffer.width - 1) * pixelSize}px;
  margin-bottom: ${(buffer.height - 1) * pixelSize}px;
  box-shadow:
    ${shadows.join(',\n    ')};
}`;

  return css;
}

/**
 * Generates clean, crisp, resolution-independent SVG vector markup.
 */
export function generateSvg(
  buffer: PixelBuffer,
  pixelSize: number = 8
): string {
  const width = buffer.width * pixelSize;
  const height = buffer.height * pixelSize;
  const rects: string[] = [];

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const col = buffer.getPixel(x, y);
      const alpha = (col >>> 24) & 0xff;
      if (alpha === 0) continue;

      const px = x * pixelSize;
      const py = y * pixelSize;
      const r = col & 0xff;
      const g = (col >>> 8) & 0xff;
      const b = (col >>> 16) & 0xff;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

      if (alpha === 255) {
        rects.push(`<rect x="${px}" y="${py}" width="${pixelSize}" height="${pixelSize}" fill="${hex}" />`);
      } else {
        const opacity = (alpha / 255).toFixed(2);
        rects.push(`<rect x="${px}" y="${py}" width="${pixelSize}" height="${pixelSize}" fill="${hex}" fill-opacity="${opacity}" />`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">
  ${rects.join('\n  ')}
</svg>`;

  return svg;
}

/**
 * Triggers a browser download of a text string as a file.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
