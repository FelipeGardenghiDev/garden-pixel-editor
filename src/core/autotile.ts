/**
 * Industrial Autotiling Engine & Tilemap Exporter (Godot 4 & Tiled)
 * Implementa bitmasking padrão de 47 tiles (Wang-Blob / 8-neighbors) e 16 tiles (4-cardinals)
 * para transições automáticas de terreno e exportação direta para Game Engines.
 */

export interface AutotileNeighborMask {
  north: boolean;
  northEast: boolean;
  east: boolean;
  southEast: boolean;
  south: boolean;
  southWest: boolean;
  west: boolean;
  northWest: boolean;
}

/**
 * Mapeamento dos 47 bits canônicos de blob autotiling para um índice contínuo de 0 a 46.
 */
export const WANG_47_LOOKUP: Record<number, number> = {
  0: 0, 2: 1, 8: 2, 10: 3, 11: 4, 16: 5, 18: 6, 22: 7, 24: 8, 26: 9, 27: 10,
  30: 11, 31: 12, 64: 13, 66: 14, 72: 15, 74: 16, 75: 17, 80: 18, 82: 19,
  86: 20, 88: 21, 90: 22, 91: 23, 94: 24, 95: 25, 104: 26, 106: 27, 107: 28,
  120: 29, 122: 30, 123: 31, 126: 32, 127: 33, 208: 34, 210: 35, 214: 36,
  216: 37, 218: 38, 219: 39, 222: 40, 223: 41, 248: 42, 250: 43, 251: 44,
  254: 45, 255: 46
};

/**
 * Calcula o bitmask canônico de 8 vizinhos considerando esquinas válidas
 * (uma quina só é ativa se ambos os cardinais adjacentes também forem ativos).
 */
export function calculate8NeighborMask(
  grid: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  targetId: number = 1
): number {
  const isTarget = (cx: number, cy: number): boolean => {
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return false;
    return grid[cy * width + cx] === targetId;
  };

  const n = isTarget(x, y - 1);
  const e = isTarget(x + 1, y);
  const s = isTarget(x, y + 1);
  const w = isTarget(x - 1, y);

  // Cantos só contam se ambos os cardinais adjacentes existirem
  const ne = n && e && isTarget(x + 1, y - 1);
  const se = s && e && isTarget(x + 1, y + 1);
  const sw = s && w && isTarget(x - 1, y + 1);
  const nw = n && w && isTarget(x - 1, y - 1);

  let mask = 0;
  if (n) mask |= 1 << 0;  // 1
  if (ne) mask |= 1 << 1; // 2
  if (e) mask |= 1 << 2;  // 4
  if (se) mask |= 1 << 3; // 8
  if (s) mask |= 1 << 4;  // 16
  if (sw) mask |= 1 << 5; // 32
  if (w) mask |= 1 << 6;  // 64
  if (nw) mask |= 1 << 7; // 128

  return mask;
}

/**
 * Obtém o índice canônico de 0 a 46 para o tile correspondente
 */
export function getWang47Index(
  grid: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  targetId: number = 1
): number {
  if (grid[y * width + x] !== targetId) return -1;
  const mask = calculate8NeighborMask(grid, x, y, width, height, targetId);
  return WANG_47_LOOKUP[mask] ?? 0;
}

/**
 * Processa um grid de terreno completo gerando os índices de autotile para cada célula
 */
export function processAutotileGrid(
  grid: number[],
  width: number,
  height: number,
  targetId: number = 1
): number[] {
  const result = new Array(width * height).fill(-1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y * width + x] === targetId) {
        result[y * width + x] = getWang47Index(grid, x, y, width, height, targetId);
      }
    }
  }
  return result;
}

/**
 * Exporta dados de Tilemap para o padrão oficial do Tiled Map Editor (.json / .tmj)
 */
export function exportToTiledJSON(
  grid: number[],
  width: number,
  height: number,
  tileWidth = 16,
  tileHeight = 16,
  layerName = 'Terrain_Autotile'
): object {
  const autotiled = processAutotileGrid(grid, width, height);
  // No Tiled, 0 é vazio e os tiles começam em 1 (GID)
  const tiledData = autotiled.map(val => (val >= 0 ? val + 1 : 0));

  return {
    compressionlevel: -1,
    height,
    width,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tileheight: tileHeight,
    tilewidth: tileWidth,
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    layers: [
      {
        data: tiledData,
        height,
        width,
        id: 1,
        name: layerName,
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        x: 0,
        y: 0
      }
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'Autotile_Tileset',
        tileheight: tileHeight,
        tilewidth: tileWidth,
        tilecount: 47,
        columns: 8
      }
    ]
  };
}

/**
 * Exporta para o formato Godot 4 TileMapLayer / TileSet JSON
 */
export function exportToGodot4JSON(
  grid: number[],
  width: number,
  height: number,
  tileSize = 16
): object {
  const autotiled = processAutotileGrid(grid, width, height);
  const cells: Array<{ x: number; y: number; sourceId: number; atlasX: number; atlasY: number }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileIdx = autotiled[y * width + x];
      if (tileIdx >= 0) {
        const atlasX = tileIdx % 8;
        const atlasY = Math.floor(tileIdx / 8);
        cells.push({
          x,
          y,
          sourceId: 0,
          atlasX,
          atlasY
        });
      }
    }
  }

  return {
    format: 'godot_4_tilemap',
    tileSize: [tileSize, tileSize],
    layerCount: 1,
    cells
  };
}
