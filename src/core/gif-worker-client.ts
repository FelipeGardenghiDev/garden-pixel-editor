import { PixelDocument } from './document';
import { exportGifBlob, type GifExportOptions } from './gif-export';

export function exportGifAsync(
  doc: PixelDocument,
  options: GifExportOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  // Graceful fallback to main thread if Web Worker is not supported (e.g. Node/SSR/Vitest)
  if (typeof Worker === 'undefined') {
    return Promise.resolve(exportGifBlob(doc, options));
  }

  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL('../workers/gif-export.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const id = `gif_${Date.now()}_${Math.random()}`;
      const frameCount = doc.frames.length;
      const frames: Uint32Array[] = [];

      for (let i = 0; i < frameCount; i++) {
        const composite = doc.composite(undefined, i);
        frames.push(new Uint32Array(composite.data));
      }

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.id !== id) return;

        if (msg.type === 'progress') {
          if (onProgress) {
            onProgress(msg.current, msg.total);
          }
        } else if (msg.type === 'success') {
          worker.terminate();
          const blob = new Blob([msg.bytes], { type: 'image/gif' });
          resolve(blob);
        } else if (msg.type === 'error') {
          worker.terminate();
          reject(new Error(msg.error));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      worker.postMessage({
        id,
        frames,
        width: doc.width,
        height: doc.height,
        scale: options.scale || 4,
        fps: options.fps || 8,
        transparent: options.transparent !== false,
        backgroundColor: options.backgroundColor,
        repeat: options.repeat !== undefined ? options.repeat : 0
      });
    } catch {
      // If Web Worker constructor fails, fallback safely to synchronous execution
      resolve(exportGifBlob(doc, options));
    }
  });
}
