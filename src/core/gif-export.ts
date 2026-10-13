import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { PixelDocument } from './document';
import { hexToUint32, uint32ToRgba } from './color';

export interface GifExportOptions {
  scale?: number;
  fps?: number;
  transparent?: boolean;
  backgroundColor?: string;
  repeat?: number; // 0 = loop forever, -1 = no loop
}

/**
 * Encodes all frames of a PixelDocument into an animated GIF byte array using nearest-neighbor scaling.
 */
export function generateAnimatedGif(
  doc: PixelDocument,
  options: GifExportOptions = {}
): Uint8Array {
  const scale = Math.max(1, Math.min(16, options.scale || 4));
  const fps = Math.max(1, Math.min(30, options.fps || 8));
  const delay = Math.round(1000 / fps);
  const isTransparent = options.transparent !== false;
  const repeat = options.repeat !== undefined ? options.repeat : 0;

  const targetW = doc.width * scale;
  const targetH = doc.height * scale;

  let bgR = 255;
  let bgG = 255;
  let bgB = 255;
  if (!isTransparent && options.backgroundColor) {
    const bg32 = hexToUint32(options.backgroundColor);
    const [r, g, b] = uint32ToRgba(bg32);
    bgR = r;
    bgG = g;
    bgB = b;
  }

  const gif = GIFEncoder();
  const frameCount = Math.max(1, doc.frames.length);

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const composite = doc.composite(undefined, frameIdx);
    const rgbaBuffer = new Uint8Array(targetW * targetH * 4);

    // Nearest-neighbor upscale of composite buffer to RGBA
    for (let y = 0; y < targetH; y++) {
      const srcY = Math.floor(y / scale);
      const rowOffset = y * targetW;
      const srcRowOffset = srcY * doc.width;

      for (let x = 0; x < targetW; x++) {
        const srcX = Math.floor(x / scale);
        const col32 = composite.data[srcRowOffset + srcX];
        const r = col32 & 0xFF;
        const g = (col32 >> 8) & 0xFF;
        const b = (col32 >> 16) & 0xFF;
        const a = (col32 >> 24) & 0xFF;

        const dstIdx = (rowOffset + x) * 4;

        if (a === 0 && !isTransparent) {
          rgbaBuffer[dstIdx] = bgR;
          rgbaBuffer[dstIdx + 1] = bgG;
          rgbaBuffer[dstIdx + 2] = bgB;
          rgbaBuffer[dstIdx + 3] = 255;
        } else {
          rgbaBuffer[dstIdx] = r;
          rgbaBuffer[dstIdx + 1] = g;
          rgbaBuffer[dstIdx + 2] = b;
          rgbaBuffer[dstIdx + 3] = a;
        }
      }
    }

    // Quantize palette to 256 colors
    const palette = quantize(rgbaBuffer, 256, {
      format: 'rgba4444',
      oneBitAlpha: isTransparent
    });

    const index = applyPalette(rgbaBuffer, palette, 'rgba4444');

    let transparentIndex: number | undefined = undefined;
    if (isTransparent) {
      const foundIdx = palette.findIndex((c: number[]) => c[3] === 0 || c[3] < 128);
      if (foundIdx >= 0) {
        transparentIndex = foundIdx;
      }
    }

    gif.writeFrame(index, targetW, targetH, {
      palette,
      delay,
      transparent: isTransparent && transparentIndex !== undefined,
      transparentIndex,
      repeat: frameIdx === 0 ? repeat : undefined
    });
  }

  gif.finish();
  return gif.bytes();
}

/**
 * Creates a GIF Blob from a PixelDocument.
 */
export function exportGifBlob(
  doc: PixelDocument,
  options: GifExportOptions = {}
): Blob {
  const bytes = generateAnimatedGif(doc, options);
  return new Blob([bytes as any], { type: 'image/gif' });
}

/**
 * Triggers a browser download for the animated GIF file.
 */
export function downloadAnimatedGif(
  doc: PixelDocument,
  options: GifExportOptions = {},
  filename: string = 'animacao.gif'
): void {
  const blob = exportGifBlob(doc, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
