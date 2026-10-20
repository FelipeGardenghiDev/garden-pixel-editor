import { describe, it, expect } from 'vitest';
import { 
  calculate8NeighborMask, 
  getWang47Index, 
  processAutotileGrid, 
  exportToTiledJSON, 
  exportToGodot4JSON 
} from '../autotile';
import { PixelDocument } from '../document';
import { serializeDocument, deserializeDocument } from '../storage-indexeddb';

describe('Autotiling & Tilemap Engine (Senior Grade)', () => {
  it('correctly calculates 8-neighbor bitmask and identifies isolated tiles', () => {
    // 3x3 grid with only center tile active
    const grid = [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ];
    const mask = calculate8NeighborMask(grid, 1, 1, 3, 3, 1);
    expect(mask).toBe(0); // No neighbors
    expect(getWang47Index(grid, 1, 1, 3, 3, 1)).toBe(0);
  });

  it('correctly calculates orthogonal neighbors for Wang 47', () => {
    // Full 3x3 cross
    const grid = [
      0, 1, 0,
      1, 1, 1,
      0, 1, 0
    ];
    const mask = calculate8NeighborMask(grid, 1, 1, 3, 3, 1);
    // N (1) + E (4) + S (16) + W (64) = 85. Since corners are 0, corners don't count.
    expect(mask & 1).toBe(1);
    expect(mask & 4).toBe(4);
    expect(mask & 16).toBe(16);
    expect(mask & 64).toBe(64);
  });

  it('exports valid Tiled Map Editor JSON format', () => {
    const grid = [
      1, 1,
      1, 1
    ];
    const processed = processAutotileGrid(grid, 2, 2, 1);
    expect(processed).toHaveLength(4);
    const tiled: any = exportToTiledJSON(grid, 2, 2, 16, 16, 'Grass');
    expect(tiled.type).toBe('map');
    expect(tiled.width).toBe(2);
    expect(tiled.height).toBe(2);
    expect(tiled.layers[0].data).toHaveLength(4);
    expect(tiled.tilesets[0].tilecount).toBe(47);
  });

  it('exports valid Godot 4 TileMapLayer format', () => {
    const grid = [
      1, 0,
      0, 1
    ];
    const godot: any = exportToGodot4JSON(grid, 2, 2, 16);
    expect(godot.format).toBe('godot_4_tilemap');
    expect(godot.cells).toHaveLength(2);
    expect(godot.cells[0]).toHaveProperty('atlasX');
    expect(godot.cells[0]).toHaveProperty('atlasY');
  });
});

describe('IndexedDB Document Serialization & Crash Recovery', () => {
  it('serializes and deserializes PixelDocument with multiple layers and blend modes', () => {
    const doc = new PixelDocument(16, 16);
    const l1 = doc.layers[0];
    l1.buffer[0] = 0xFF00FF00; // Green

    const l2 = doc.addLayer('Overlay Layer');
    l2.blendMode = 'multiply';
    l2.opacity = 0.8;
    l2.buffer[0] = 0xFFFF0000; // Red

    const serialized = serializeDocument(doc, 'test_session');
    expect(serialized.id).toBe('test_session');
    expect(serialized.width).toBe(16);
    expect(serialized.frames[0].layers).toHaveLength(2);

    const restored = deserializeDocument(serialized);
    expect(restored.width).toBe(16);
    expect(restored.height).toBe(16);
    expect(restored.layers).toHaveLength(2);
    expect(restored.layers[1].blendMode).toBe('multiply');
    expect(restored.layers[1].opacity).toBe(0.8);
    expect(restored.layers[1].buffer[0]).toBe(0xFFFF0000 >>> 0);
  });
});
