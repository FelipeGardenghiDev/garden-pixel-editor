import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Grid, Download } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';

interface IsometricTilingModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

export const IsometricTilingModal: React.FC<IsometricTilingModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gridDim, setGridDim] = useState<number>(5); // 3x3, 5x5, 7x7
  const [zoom, setZoom] = useState<number>(2); // 1x, 2x, 3x
  const [showTileBorders, setShowTileBorders] = useState<boolean>(true);
  const [tileMode, setTileMode] = useState<'floor' | 'stacked'>('floor');
  const [verticalOffset, setVerticalOffset] = useState<number>(0); // Vertical stacking offset

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const doc = engine.document;
    const tw = doc.width;
    const th = doc.height;

    // Prepare offscreen canvas of the composite sprite
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = tw;
    spriteCanvas.height = th;
    const spriteCtx = spriteCanvas.getContext('2d');
    if (!spriteCtx) return;

    const composite = doc.composite();
    const imgData = spriteCtx.createImageData(tw, th);
    new Uint32Array(imgData.data.buffer).set(composite.data);
    spriteCtx.putImageData(imgData, 0, 0);

    // Canvas dimensions for the isometric grid
    const totalW = Math.max(500, (gridDim * tw * zoom));
    const totalH = Math.max(380, (gridDim * th * zoom * 0.75));

    canvas.width = totalW;
    canvas.height = totalH;

    // Background pattern
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    const bgStep = 16;
    for (let x = 0; x < canvas.width; x += bgStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += bgStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.imageSmoothingEnabled = false;

    const centerX = canvas.width / 2;
    const startY = 60 * zoom;

    // Isometric 2:1 tile step:
    // When moving along isometric X axis: dx = tw / 2, dy = th / 4 (or th / 2 depending on tile proportions)
    // For standard isometric tiles, height is half width (2:1).
    const halfW = (tw * zoom) / 2;
    const halfH = (th * zoom) / 2;
    const stepY = halfH * 0.5; // 2:1 step

    // Render tiles sorted from back to front (top to bottom)
    const range = Math.floor(gridDim / 2);
    
    // Sort isometric coordinates (isoX + isoY) for correct depth ordering
    const tiles: Array<{ isoX: number; isoY: number; screenX: number; screenY: number }> = [];

    for (let iy = -range; iy <= range; iy++) {
      for (let ix = -range; ix <= range; ix++) {
        const sx = centerX + (ix - iy) * halfW - (tw * zoom) / 2;
        const sy = startY + (ix + iy) * stepY + (tileMode === 'stacked' ? verticalOffset * zoom : 0);
        tiles.push({ isoX: ix, isoY: iy, screenX: sx, screenY: sy });
      }
    }

    // Sort by depth (Y first, then X)
    tiles.sort((a, b) => (a.isoX + a.isoY) - (b.isoX + b.isoY));

    // Draw all tiles
    for (const tile of tiles) {
      ctx.drawImage(spriteCanvas, tile.screenX, tile.screenY, tw * zoom, th * zoom);

      // Optional isometric tile border outline
      if (showTileBorders) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'; // cyan-400
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Diamond points: Top, Right, Bottom, Left
        const tx = tile.screenX + (tw * zoom) / 2;
        const ty = tile.screenY;
        const bx = tx;
        const by = tile.screenY + (th * zoom);
        const lx = tile.screenX;
        const ly = tile.screenY + (th * zoom) / 2;
        const rx = tile.screenX + (tw * zoom);
        const ry = ly;

        ctx.moveTo(tx, ty);
        ctx.lineTo(rx, ry);
        ctx.lineTo(bx, by);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }, [engine, gridDim, zoom, showTileBorders, tileMode, verticalOffset, isOpen]);

  useEffect(() => {
    render();
  }, [render]);

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `isometric_tiling_${gridDim}x${gridDim}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="iso-tiling-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 id="iso-tiling-title" className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                Repetição Isométrica (Floor Map Tiling)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  GRID 2:1
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Visualize seu tile repetido em padrão diamante como um chão ou mapa de jogo isométrico.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Canvas area */}
          <div className="flex-1 p-4 bg-zinc-950 flex items-center justify-center overflow-auto border-b md:border-b-0 md:border-r border-zinc-800 relative">
            <canvas
              ref={canvasRef}
              className="rounded-xl border border-zinc-800 shadow-2xl max-w-full max-h-[500px] object-contain"
            />
          </div>

          {/* Settings Sidebar */}
          <div className="w-full md:w-72 p-5 flex flex-col gap-4 bg-zinc-900/60 overflow-y-auto">
            {/* Grid dimension */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Dimensão do Grid</label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 7].map((dim) => (
                  <button
                    key={dim}
                    onClick={() => setGridDim(dim)}
                    className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition-all ${
                      gridDim === dim
                        ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {dim}×{dim}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Scale */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Escala de Zoom</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoom(z)}
                    className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition-all ${
                      zoom === z
                        ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {z}×
                  </button>
                ))}
              </div>
            </div>

            {/* Mode: Floor or Stacked */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Modo de Exibição</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTileMode('floor')}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    tileMode === 'floor'
                      ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Chão / Piso
                </button>
                <button
                  onClick={() => setTileMode('stacked')}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    tileMode === 'stacked'
                      ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Empilhado
                </button>
              </div>
            </div>

            {/* Stacking Height Offset */}
            {tileMode === 'stacked' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Offset Vertical (Z)</span>
                  <span className="font-mono text-cyan-400">{verticalOffset}px</span>
                </div>
                <input
                  type="range"
                  min="-32"
                  max="32"
                  value={verticalOffset}
                  onChange={(e) => setVerticalOffset(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            )}

            {/* Toggle Tile Borders */}
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-2 border-t border-zinc-800">
              <input
                type="checkbox"
                checked={showTileBorders}
                onChange={(e) => setShowTileBorders(e.target.checked)}
                className="rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 accent-cyan-500"
              />
              <span>Mostrar contornos 2:1 dos tiles</span>
            </label>

            {/* Actions */}
            <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-zinc-800">
              <button
                onClick={handleExportPng}
                className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Mapa Tiled (.png)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
