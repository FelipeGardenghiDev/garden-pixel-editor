import { PixelBuffer } from './pixel-buffer';
import type { PixelDocument } from './document';
import type { Rect } from './types';

export type SpritesheetSource = 'frames' | 'layers' | 'tiles' | 'wrap3x3';
export type SpritesheetLayout = 'horizontal' | 'vertical' | 'grid';

export interface SpritesheetConfig {
  source: SpritesheetSource;
  layout: SpritesheetLayout;
  columns?: number;      // For grid layout
  tileSize?: number;     // For tile grid mode (16, 24, 32, 48)
  scale?: number;        // Export scale (1, 2, 4)
  padding?: number;      // Spacing between frames
}

export interface AtlasFrameInfo {
  name: string;
  frame: Rect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: Rect;
  sourceSize: { w: number; h: number };
}

export interface SpritesheetResult {
  buffer: PixelBuffer;
  frames: AtlasFrameInfo[];
  atlasJson: {
    frames: Record<string, AtlasFrameInfo>;
    meta: {
      app: string;
      version: string;
      image: string;
      format: string;
      size: { w: number; h: number };
      scale: string;
    };
  };
}

/**
 * Builds a composite spritesheet and its metadata atlas.
 */
export function buildSpritesheet(
  doc: PixelDocument,
  config: SpritesheetConfig
): SpritesheetResult {
  const {
    source,
    layout,
    columns = 4,
    tileSize = 16,
    padding = 0
  } = config;

  // 1. Gather frames
  interface RawFrame {
    name: string;
    buffer: PixelBuffer;
  }
  const rawFrames: RawFrame[] = [];

  if (source === 'frames') {
    // Each frame in animation is a frame in spritesheet
    for (let i = 0; i < doc.frames.length; i++) {
      const f = doc.frames[i];
      rawFrames.push({
        name: f.name || `frame_${i + 1}`,
        buffer: doc.composite(undefined, i)
      });
    }
  } else if (source === 'layers') {
    // Each layer is a frame
    for (let i = 0; i < doc.layers.length; i++) {
      const layer = doc.layers[i];
      const buf = new PixelBuffer(doc.width, doc.height, layer.buffer);
      rawFrames.push({
        name: layer.name || `frame_${i}`,
        buffer: buf
      });
    }
  } else if (source === 'tiles') {
    // Slices composite document into grid tiles
    const composite = doc.composite();
    const cols = Math.ceil(doc.width / tileSize);
    const rows = Math.ceil(doc.height / tileSize);
    let tileIndex = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const w = Math.min(tileSize, doc.width - x);
        const h = Math.min(tileSize, doc.height - y);

        const tileBuf = new PixelBuffer(tileSize, tileSize);
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            tileBuf.setPixel(px, py, composite.getPixel(x + px, y + py));
          }
        }

        rawFrames.push({
          name: `tile_${c}_${r}`,
          buffer: tileBuf
        });
        tileIndex++;
      }
    }
  } else if (source === 'wrap3x3') {
    // 3x3 repetition of the composite
    const composite = doc.composite();
    const repBuf = new PixelBuffer(doc.width * 3, doc.height * 3);
    for (let oy = 0; oy < 3; oy++) {
      for (let ox = 0; ox < 3; ox++) {
        repBuf.blitBuffer(ox * doc.width, oy * doc.height, composite);
      }
    }
    rawFrames.push({
      name: 'seamless_3x3_pattern',
      buffer: repBuf
    });
  }

  if (rawFrames.length === 0) {
    throw new Error('Nenhum frame para gerar o spritesheet.');
  }

  // 2. Compute arrangement
  const frameWidth = rawFrames[0].buffer.width;
  const frameHeight = rawFrames[0].buffer.height;
  const numFrames = rawFrames.length;

  let sheetCols = numFrames;
  let sheetRows = 1;

  if (layout === 'vertical') {
    sheetCols = 1;
    sheetRows = numFrames;
  } else if (layout === 'grid') {
    sheetCols = Math.max(1, Math.min(columns, numFrames));
    sheetRows = Math.ceil(numFrames / sheetCols);
  }

  const sheetWidth = sheetCols * frameWidth + (sheetCols - 1) * padding;
  const sheetHeight = sheetRows * frameHeight + (sheetRows - 1) * padding;

  const sheetBuffer = new PixelBuffer(sheetWidth, sheetHeight);
  const framesRecord: Record<string, AtlasFrameInfo> = {};
  const frameList: AtlasFrameInfo[] = [];

  for (let i = 0; i < numFrames; i++) {
    const col = i % sheetCols;
    const row = Math.floor(i / sheetCols);
    const destX = col * (frameWidth + padding);
    const destY = row * (frameHeight + padding);

    const f = rawFrames[i];
    sheetBuffer.blitBuffer(destX, destY, f.buffer);

    const frameInfo: AtlasFrameInfo = {
      name: f.name,
      frame: { x: destX, y: destY, width: frameWidth, height: frameHeight },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, width: frameWidth, height: frameHeight },
      sourceSize: { w: frameWidth, h: frameHeight }
    };

    framesRecord[f.name] = frameInfo;
    frameList.push(frameInfo);
  }

  const atlasJson = {
    frames: framesRecord,
    meta: {
      app: 'Garden Pixel Editor',
      version: '1.0',
      image: 'spritesheet.png',
      format: 'RGBA8888',
      size: { w: sheetWidth, h: sheetHeight },
      scale: '1'
    }
  };

  return {
    buffer: sheetBuffer,
    frames: frameList,
    atlasJson
  };
}

/**
 * Downloads spritesheet PNG at the specified scale.
 */
export function exportSpritesheetPng(
  buffer: PixelBuffer,
  scale: number = 1,
  filename: string = 'spritesheet.png'
): void {
  const canvas = document.createElement('canvas');
  canvas.width = buffer.width * scale;
  canvas.height = buffer.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = buffer.width;
  tempCanvas.height = buffer.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  const imgData = tempCtx.createImageData(buffer.width, buffer.height);
  const uint32View = new Uint32Array(imgData.data.buffer);
  uint32View.set(buffer.data);
  tempCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

/**
 * Downloads JSON atlas metadata.
 */
export function exportAtlasJson(
  atlasData: object,
  filename: string = 'spritesheet.json'
): void {
  const jsonStr = JSON.stringify(atlasData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
