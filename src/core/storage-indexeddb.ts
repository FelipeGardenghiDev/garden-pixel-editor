/**
 * Enterprise IndexedDB Storage & Crash Recovery Manager
 * Salva automaticamente o projeto em IndexedDB de forma não-bloqueante
 * permitindo recuperação total de sessão em caso de fechamento acidental ou reload.
 */

import { PixelDocument } from './document';
import type { BlendMode } from './types';

const DB_NAME = 'GardenPixelDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const AUTOSAVE_KEY = 'latest_autosave';

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode?: string;
  buffer: number[]; // Packed Uint32Array as numbers for JSON storage
}

export interface SerializedFrame {
  id: string;
  name: string;
  layers: SerializedLayer[];
  activeLayerId: string;
}

export interface SerializedProject {
  id: string;
  savedAt: string;
  width: number;
  height: number;
  activeFrameIndex: number;
  frames: SerializedFrame[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Serializa um PixelDocument para formato JSON compatível com IndexedDB
 */
export function serializeDocument(doc: PixelDocument, customId = AUTOSAVE_KEY): SerializedProject {
  return {
    id: customId,
    savedAt: new Date().toISOString(),
    width: doc.width,
    height: doc.height,
    activeFrameIndex: doc.activeFrameIndex,
    frames: doc.frames.map(f => ({
      id: f.id,
      name: f.name,
      activeLayerId: f.activeLayerId,
      layers: f.layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        buffer: Array.from(l.buffer)
      }))
    }))
  };
}

/**
 * Reconstrói um PixelDocument a partir dos dados serializados
 */
export function deserializeDocument(data: SerializedProject): PixelDocument {
  const doc = new PixelDocument(data.width, data.height);
  doc.frames = data.frames.map(f => ({
    id: f.id,
    name: f.name,
    activeLayerId: f.activeLayerId,
    layers: f.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: (l.blendMode as BlendMode) || 'normal',
      buffer: new Uint32Array(l.buffer)
    }))
  }));
  doc.activeFrameIndex = Math.max(0, Math.min(doc.frames.length - 1, data.activeFrameIndex || 0));
  return doc;
}

/**
 * Salva o estado atual do projeto no IndexedDB como auto-save
 */
export async function saveToIndexedDB(doc: PixelDocument, key = AUTOSAVE_KEY): Promise<void> {
  const db = await openDatabase();
  const serialized = serializeDocument(doc, key);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(serialized);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Carrega o último auto-save do IndexedDB se existir
 */
export async function loadFromIndexedDB(key = AUTOSAVE_KEY): Promise<PixelDocument | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result) {
          resolve(deserializeDocument(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
