import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface WorkerRequest {
  id: string;
  frames: Uint32Array[];
  width: number;
  height: number;
  scale: number;
  fps: number;
  transparent: boolean;
  backgroundColor?: string;
  repeat: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, frames, width, height, scale, fps, transparent, backgroundColor, repeat } = e.data;

  try {
    const delay = Math.round(1000 / Math.max(1, fps));
    const targetW = width * scale;
    const targetH = height * scale;

    let bgR = 255;
    let bgG = 255;
    let bgB = 255;
    if (!transparent && backgroundColor) {
      const clean = backgroundColor.replace('#', '');
      bgR = parseInt(clean.substring(0, 2), 16) || 255;
      bgG = parseInt(clean.substring(2, 4), 16) || 255;
      bgB = parseInt(clean.substring(4, 6), 16) || 255;
    }

    const gif = GIFEncoder();
    const totalFrames = frames.length;

    for (let f = 0; f < totalFrames; f++) {
      const frameBuffer = frames[f];
      const rgbaBuffer = new Uint8Array(targetW * targetH * 4);

      for (let y = 0; y < targetH; y++) {
        const srcY = Math.floor(y / scale);
        const rowOffset = y * targetW;
        const srcRowOffset = srcY * width;

        for (let x = 0; x < targetW; x++) {
          const srcX = Math.floor(x / scale);
          const col32 = frameBuffer[srcRowOffset + srcX];
          const r = col32 & 0xFF;
          const g = (col32 >> 8) & 0xFF;
          const b = (col32 >> 16) & 0xFF;
          const a = (col32 >> 24) & 0xFF;

          const dstIdx = (rowOffset + x) * 4;

          if (a === 0 && !transparent) {
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

      // Quantize to 256 colors
      const palette = quantize(rgbaBuffer, 256, {
        format: 'rgba4444',
        oneBitAlpha: transparent
      });

      const index = applyPalette(rgbaBuffer, palette, 'rgba4444');

      let transparentIndex: number | undefined = undefined;
      if (transparent) {
        const foundIdx = palette.findIndex((c: number[]) => c[3] === 0 || c[3] < 128);
        if (foundIdx >= 0) {
          transparentIndex = foundIdx;
        }
      }

      gif.writeFrame(index, targetW, targetH, {
        palette,
        delay,
        transparent: transparent && transparentIndex !== undefined,
        transparentIndex,
        repeat: f === 0 ? repeat : undefined
      });

      // Post progress update
      (self as any).postMessage({
        type: 'progress',
        id,
        current: f + 1,
        total: totalFrames
      });
    }

    gif.finish();
    const bytes = gif.bytes();

    (self as any).postMessage(
      {
        type: 'success',
        id,
        bytes
      },
      // Transfer byte buffer for zero-copy high performance
      [bytes.buffer]
    );
  } catch (err: any) {
    (self as any).postMessage({
      type: 'error',
      id,
      error: err?.message || 'Erro desconhecido ao codificar GIF no Web Worker.'
    });
  }
};
