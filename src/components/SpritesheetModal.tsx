import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Download, FileSpreadsheet, FileJson, Grid, Layers, Repeat } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { 
  buildSpritesheet, 
  exportSpritesheetPng, 
  exportAtlasJson,
  type SpritesheetSource, 
  type SpritesheetLayout 
} from '../core/spritesheet';

interface SpritesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

export const SpritesheetModal: React.FC<SpritesheetModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const [source, setSource] = useState<SpritesheetSource>(
    engine.document.layers.length > 1 ? 'layers' : (engine.projectionMode === 'wrap' ? 'wrap3x3' : 'tiles')
  );
  const [layout, setLayout] = useState<SpritesheetLayout>('horizontal');
  const [columns, setColumns] = useState<number>(4);
  const [tileSize, setTileSize] = useState<number>(16);
  const [padding, setPadding] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'preview' | 'json'>('preview');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute spritesheet result
  const sheetResult = useMemo(() => {
    if (!isOpen) return null;
    try {
      return buildSpritesheet(engine.document, {
        source,
        layout,
        columns,
        tileSize,
        padding,
        scale
      });
    } catch {
      return null;
    }
  }, [isOpen, engine.document, source, layout, columns, tileSize, padding, scale]);

  // Render preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sheetResult) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buf = sheetResult.buffer;
    const previewScale = Math.min(
      Math.max(1, Math.floor(360 / Math.max(buf.width, buf.height))),
      8
    );

    canvas.width = buf.width * previewScale;
    canvas.height = buf.height * previewScale;

    // Checkerboard
    const size = 8;
    for (let py = 0; py < canvas.height; py += size) {
      for (let px = 0; px < canvas.width; px += size) {
        const even = (Math.floor(px / size) + Math.floor(py / size)) % 2 === 0;
        ctx.fillStyle = even ? '#1c1c20' : '#141416';
        ctx.fillRect(px, py, size, size);
      }
    }

    // Draw sprite buffer
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = buf.width;
    tempCanvas.height = buf.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const imgData = tempCtx.createImageData(buf.width, buf.height);
      const uintView = new Uint32Array(imgData.data.buffer);
      uintView.set(buf.data);
      tempCtx.putImageData(imgData, 0, 0);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }

    // Draw frame boundaries
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    for (const f of sheetResult.frames) {
      ctx.strokeRect(
        f.frame.x * previewScale + 0.5,
        f.frame.y * previewScale + 0.5,
        f.frame.width * previewScale - 1,
        f.frame.height * previewScale - 1
      );
    }
  }, [sheetResult]);

  if (!isOpen) return null;

  const handleExportPng = () => {
    if (!sheetResult) return;
    exportSpritesheetPng(sheetResult.buffer, scale, `spritesheet_${source}_${scale}x.png`);
  };

  const handleExportJson = () => {
    if (!sheetResult) return;
    exportAtlasJson(sheetResult.atlasJson, `spritesheet_${source}.json`);
  };

  const handleExportBoth = () => {
    handleExportPng();
    handleExportJson();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
              Exportar Spritesheet & Atlas JSON
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                PHASER / GODOT / PIXI
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left: Interactive Preview */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-zinc-950 relative border-b md:border-b-0 md:border-r border-zinc-800 overflow-auto">
            {/* Toggle Preview / JSON */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 shadow-lg backdrop-blur-xs text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  activeTab === 'preview' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Visualização
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'json' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                Atlas JSON
              </button>
            </div>

            {activeTab === 'preview' ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <canvas
                  ref={canvasRef}
                  className="rounded-xl border border-zinc-800 shadow-2xl max-w-full max-h-[380px] object-contain"
                />
                {sheetResult && (
                  <span className="text-xs text-zinc-400 font-mono">
                    {sheetResult.frames.length} frames | Dimensões: {sheetResult.buffer.width} × {sheetResult.buffer.height}px
                  </span>
                )}
              </div>
            ) : (
              <pre className="w-full h-full max-h-96 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 text-[11px] font-mono text-cyan-300 overflow-auto select-text">
                {JSON.stringify(sheetResult?.atlasJson, null, 2)}
              </pre>
            )}
          </div>

          {/* Right: Settings */}
          <div className="w-full md:w-80 p-5 overflow-y-auto flex flex-col gap-4 bg-zinc-900/70 text-xs">
            {/* Source */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">
                Origem dos Frames
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => setSource('layers')}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    source === 'layers'
                      ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300 font-medium'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Camadas ({engine.document.layers.length})</div>
                    <div className="text-[10px] text-zinc-500">Cada camada como um quadro</div>
                  </div>
                </button>

                <button
                  onClick={() => setSource('tiles')}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    source === 'tiles'
                      ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300 font-medium'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Grid className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Fatias de Grid (Tiles)</div>
                    <div className="text-[10px] text-zinc-500">Divide o canvas em blocos</div>
                  </div>
                </button>

                <button
                  onClick={() => setSource('wrap3x3')}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    source === 'wrap3x3'
                      ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300 font-medium'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Repeat className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Repetição 3×3 Seamless</div>
                    <div className="text-[10px] text-zinc-500">Atlas de teste contínuo</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tile Size (only when source === tiles) */}
            {source === 'tiles' && (
              <div className="flex flex-col gap-1.5 p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex justify-between text-zinc-300">
                  <span>Tamanho do Tile:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{tileSize}×{tileSize}px</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[8, 16, 24, 32].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setTileSize(sz)}
                      className={`py-1 rounded text-center font-mono ${
                        tileSize === sz ? 'bg-emerald-600 text-white font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layout */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
              <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">
                Disposição (Layout)
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setLayout('horizontal')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-medium ${
                    layout === 'horizontal' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => setLayout('vertical')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-medium ${
                    layout === 'vertical' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Vertical
                </button>
                <button
                  onClick={() => setLayout('grid')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-medium ${
                    layout === 'grid' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Grid
                </button>
              </div>

              {layout === 'grid' && (
                <div className="flex items-center justify-between mt-1 text-zinc-300">
                  <span>Colunas:</span>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={columns}
                    onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))}
                    className="w-16 bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-center font-mono text-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* Padding & Scale */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Espaçamento (Padding):</span>
                <span className="font-mono text-zinc-400">{padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />

              <div className="flex items-center justify-between text-zinc-300 mt-2">
                <span>Escala de Exportação:</span>
                <select
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono"
                >
                  <option value={1}>1x (Original)</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-auto pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <button
                onClick={handleExportBoth}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Pacote Completo (PNG + JSON)
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleExportPng}
                  className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center justify-center gap-1 border border-zinc-700 transition-colors"
                >
                  Apenas PNG
                </button>
                <button
                  onClick={handleExportJson}
                  className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center justify-center gap-1 border border-zinc-700 transition-colors"
                >
                  Apenas JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
