import { PixelDocument } from './document';

export function exportDocumentToPng(doc: PixelDocument, scale: number = 4, filename: string = 'pixel-art.png'): void {
  const composite = doc.composite();
  const width = doc.width;
  const height = doc.height;

  // 1. Render 1x into a base canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return;

  const imgData = srcCtx.createImageData(width, height);
  // Directly copy 32-bit pixel buffer to ImageData buffer
  const uint32View = new Uint32Array(imgData.data.buffer);
  uint32View.set(composite.data);
  srcCtx.putImageData(imgData, 0, 0);

  // 2. Scale up nearest-neighbor into export canvas
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width * scale;
  exportCanvas.height = height * scale;
  const exportCtx = exportCanvas.getContext('2d');
  if (!exportCtx) return;

  exportCtx.imageSmoothingEnabled = false;
  exportCtx.drawImage(srcCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

  // 3. Trigger download
  const link = document.createElement('a');
  link.download = filename;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}
