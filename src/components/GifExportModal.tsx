import React, { useState, useEffect } from 'react';
import { 
  X, Film, Download, RefreshCw 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { exportGifBlob } from '../core/gif-export';
import { exportGifAsync } from '../core/gif-worker-client';

interface GifExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

export const GifExportModal: React.FC<GifExportModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const [scale, setScale] = useState<number>(4);
  const [fps, setFps] = useState<number>(engine.fps || 8);
  const [transparent, setTransparent] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#18181b');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  const docW = engine.document.width;
  const docH = engine.document.height;
  const finalW = docW * scale;
  const finalH = docH * scale;

  // Generate GIF blob for live preview
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let currentUrl: string | null = null;

    const timer = setTimeout(() => {
      try {
        const blob = exportGifBlob(engine.document, {
          scale: Math.min(scale, 8), // limit preview generation scale to 8x for speed
          fps,
          transparent,
          backgroundColor: transparent ? undefined : backgroundColor,
          repeat: 0
        });

        if (isMounted) {
          currentUrl = URL.createObjectURL(blob);
          setPreviewUrl(currentUrl);
          setFileSizeBytes(blob.size);
        }
      } catch (err) {
        console.error('Failed to generate preview GIF', err);
      }
    }, 10);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [isOpen, scale, fps, transparent, backgroundColor, engine.document]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: engine.document.frames.length });
    try {
      const blob = await exportGifAsync(
        engine.document,
        {
          scale,
          fps,
          transparent,
          backgroundColor: transparent ? undefined : backgroundColor,
          repeat: 0
        },
        (current, total) => setExportProgress({ current, total })
      );

      const filename = `garden_animation_${finalW}x${finalH}_${fps}fps.gif`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export error in worker', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const formattedSize = fileSizeBytes
    ? fileSizeBytes > 1024 * 1024
      ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(fileSizeBytes / 1024)} KB`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Exportar GIF Animado
                <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800/60 px-1.5 py-0.2 rounded font-mono font-semibold">
                  .GIF
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Gere uma animação em loop para compartilhar no Discord, Twitter ou portfólio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Live Preview Panel */}
          <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-2xl border border-zinc-800 min-h-48 relative overflow-hidden">
            {/* Checkerboard background for transparency preview */}
            <div 
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)`,
                backgroundSize: `16px 16px`,
                backgroundPosition: `0 0, 0 8px, 8px -8px, -8px 0px`
              }}
            />

            {previewUrl ? (
              <img
                src={previewUrl}
                alt="GIF Preview"
                className="max-h-48 max-w-full object-contain relative z-10 rounded shadow-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="flex items-center gap-2 text-zinc-500 text-xs relative z-10">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                Renderizando prévia...
              </div>
            )}

            {formattedSize && (
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-zinc-900/90 border border-zinc-700 text-[10px] font-mono text-zinc-300 z-20">
                {finalW}×{finalH}px • ~{formattedSize}
              </div>
            )}
          </div>

          {/* Scale selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Escala de Resolução
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 4, 8, 16].map((s) => {
                const isSelected = scale === s;
                return (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-sm'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-mono font-bold text-xs">{s}x</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">
                      {docW * s}×{docH * s}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed & Transparency Controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* FPS Control */}
            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300">Velocidade (FPS)</span>
                <span className="font-mono text-xs font-bold text-purple-400">{fps} FPS</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                <span>1 FPS (Lento)</span>
                <span>24 FPS (Rápido)</span>
              </div>
            </div>

            {/* Transparency Toggle */}
            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Fundo Transparente</span>
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                />
              </div>

              {!transparent && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400">Cor de Fundo:</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-300">{backgroundColor}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            {engine.document.frames.length} quadro(s) • Loop infinito
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              disabled={!previewUrl || isExporting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-950/60 transition-all"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-200" />
                  <span>Processando Worker ({exportProgress?.current}/{exportProgress?.total})...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar GIF ({finalW}×{finalH}px)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
