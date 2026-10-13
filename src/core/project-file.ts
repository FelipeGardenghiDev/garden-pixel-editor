import type { EditorEngine } from './editor-engine';
import type { GardenProjectData, Frame, Layer } from './types';
import { PixelDocument } from './document';

/**
 * Encodes Uint32Array buffer to base64 string.
 */
export function bufferToBase64(buf: Uint32Array): string {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Decodes base64 string back to Uint32Array.
 */
export function base64ToBuffer(base64: string, expectedLength: number): Uint32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const result = new Uint32Array(bytes.buffer);
  if (result.length !== expectedLength) {
    const safeBuf = new Uint32Array(expectedLength);
    safeBuf.set(result.subarray(0, Math.min(result.length, expectedLength)));
    return safeBuf;
  }
  return result;
}

/**
 * Serializes the current EditorEngine state into a GardenProjectData object.
 */
export function serializeProject(engine: EditorEngine): GardenProjectData {
  const doc = engine.document;
  const framesData = doc.frames.map((frame) => ({
    id: frame.id,
    name: frame.name,
    activeLayerId: frame.activeLayerId,
    layers: frame.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      data: bufferToBase64(layer.buffer)
    }))
  }));

  return {
    version: '1.0',
    appName: 'Garden Pixel Editor',
    createdAt: new Date().toISOString(),
    width: doc.width,
    height: doc.height,
    projectionMode: engine.projectionMode,
    fps: engine.fps || 8,
    palettes: [doc.activePalette],
    activePaletteId: doc.activePalette.id,
    frames: framesData
  };
}

/**
 * Restores an EditorEngine instance from a GardenProjectData object.
 */
export function deserializeProject(engine: EditorEngine, projectData: GardenProjectData): void {
  const { width, height, projectionMode, frames, fps } = projectData;

  const newDoc = new PixelDocument(width, height);
  newDoc.frames = [];

  for (const fData of frames) {
    const restoredLayers: Layer[] = fData.layers.map((lData) => ({
      id: lData.id,
      name: lData.name,
      visible: lData.visible,
      opacity: lData.opacity,
      buffer: base64ToBuffer(lData.data, width * height)
    }));

    const restoredFrame: Frame = {
      id: fData.id,
      name: fData.name,
      activeLayerId: fData.activeLayerId || (restoredLayers[0] ? restoredLayers[0].id : ''),
      layers: restoredLayers
    };

    newDoc.frames.push(restoredFrame);
  }

  if (newDoc.frames.length === 0) {
    newDoc.addFrame();
  }

  newDoc.activeFrameIndex = 0;
  engine.document = newDoc;
  engine.projectionMode = projectionMode;
  if (fps) engine.fps = fps;

  // Clear selections & preview buffers
  engine.selectionRect = null;
  engine.floatingSelection = null;
  engine.previewBuffer = new (engine.previewBuffer.constructor as any)(width, height);
  engine.history.clear();

  // Re-hook document change listener
  newDoc.onChange(() => engine.notifyState());
  engine.notifyState();
}

/**
 * Downloads the current project as a .garden JSON file.
 */
export function downloadProjectFile(engine: EditorEngine, filename: string = 'meu_projeto.garden'): void {
  const data = serializeProject(engine);
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Opens a .garden file from user's disk via HTML input or File System Access API.
 */
export async function openProjectFromFile(engine: EditorEngine, file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text) as GardenProjectData;
  if (!data.width || !data.height || !data.frames) {
    throw new Error('Arquivo de projeto .garden inválido ou corrompido.');
  }
  deserializeProject(engine, data);
}

const AUTOSAVE_STORAGE_KEY = 'garden_pixel_autosave_v1';

/**
 * Saves current state into localStorage for instant crash recovery.
 */
export function saveAutosave(engine: EditorEngine): void {
  try {
    const data = serializeProject(engine);
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // LocalStorage quota may be exceeded for very large documents
  }
}

/**
 * Restores project from localStorage autosave.
 */
export function restoreAutosave(engine: EditorEngine): boolean {
  try {
    const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!saved) return false;
    const data = JSON.parse(saved) as GardenProjectData;
    deserializeProject(engine, data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if autosave data exists in localStorage.
 */
export function hasAutosave(): boolean {
  return !!localStorage.getItem(AUTOSAVE_STORAGE_KEY);
}
