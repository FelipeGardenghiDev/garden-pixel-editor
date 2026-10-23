import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';

interface StatusBarProps {
  engine: EditorEngine;
}

export const StatusBar: React.FC<StatusBarProps> = ({ engine }) => {
  const hover = engine.currentHoverPixel;
  const isInside = hover && hover.x >= 0 && hover.x < engine.document.width && hover.y >= 0 && hover.y < engine.document.height;

  // Iso coords calculation
  const isoCoords = isInside && hover ? {
    u: Math.round((hover.x + 2 * hover.y) / 4),
    v: Math.round((-hover.x + 2 * hover.y) / 4),
  } : null;

  return (
    <footer className="safe-bottom min-h-7 bg-zinc-950 border-t border-zinc-800/80 px-3 sm:px-4 flex items-center justify-between text-xs font-mono text-zinc-500 select-none shrink-0 z-10 gap-2 py-1 sm:py-0">
      {/* Left: Pixel & Iso Coordinates & Size */}
      <div className="flex items-center gap-2 sm:gap-4 truncate">
        <div className="flex items-center gap-1">
          <span className="text-zinc-600 text-[10px] sm:text-xs">POS:</span>
          {isInside && hover ? (
            <span className="text-zinc-300 font-semibold text-[11px] sm:text-xs">
              {hover.x},{hover.y}
            </span>
          ) : (
            <span className="text-zinc-600 text-[11px]">--,--</span>
          )}
        </div>

        {engine.projectionMode === 'isometric' && isInside && isoCoords && (
          <div className="hidden sm:flex items-center gap-1 text-cyan-400">
            <span className="text-cyan-700">ISO:</span>
            <span>U:{isoCoords.u}, V:{isoCoords.v}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="text-zinc-600 text-[10px] sm:text-xs">DIM:</span>
          <span className="text-zinc-400 text-[11px] sm:text-xs">{engine.document.width}×{engine.document.height}</span>
        </div>
      </div>

      {/* Center / Right: Desktop Shortcuts Guide */}
      <div className="hidden md:flex items-center gap-3 text-[11px] text-zinc-500">
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">Espaço</kbd> Pan</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">Scroll</kbd> Zoom</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">Ctrl+Z</kbd> Undo</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">B</kbd> Lápis</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">E</kbd> Borracha</span>
      </div>

      {/* Mobile Right: Quick Zoom, Reset & Version Badge */}
      <div className="flex md:hidden items-center gap-1.5 text-xs shrink-0">
        <button
          onClick={() => engine.viewport.setZoom(Math.max(1, engine.viewport.zoom - 2))}
          className="p-1 text-zinc-400 hover:text-white active:bg-zinc-800 rounded"
          title="Diminuir Zoom"
          aria-label="Diminuir Zoom"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono font-bold text-cyan-400 min-w-6 text-center">{engine.viewport.zoom}x</span>
        <button
          onClick={() => engine.viewport.setZoom(Math.min(64, engine.viewport.zoom + 2))}
          className="p-1 text-zinc-400 hover:text-white active:bg-zinc-800 rounded"
          title="Aumentar Zoom"
          aria-label="Aumentar Zoom"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            engine.viewport.setZoom(8);
            engine.viewport.panX = 0;
            engine.viewport.panY = 0;
          }}
          className="p-1 text-zinc-500 hover:text-zinc-300 rounded ml-0.5"
          title="Resetar Zoom"
          aria-label="Resetar Zoom"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-700/80 font-mono font-semibold">
          v0.8.1
        </span>
      </div>
    </footer>
  );
};
