import React from 'react';
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
    <footer className="h-7 bg-zinc-950 border-t border-zinc-800/80 px-4 flex items-center justify-between text-xs font-mono text-zinc-500 select-none shrink-0 z-10">
      {/* Left: Pixel & Iso Coordinates */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600">POS:</span>
          {isInside && hover ? (
            <span className="text-zinc-300 font-semibold">
              X: {hover.x}, Y: {hover.y}
            </span>
          ) : (
            <span className="text-zinc-600">-- , --</span>
          )}
        </div>

        {engine.projectionMode === 'isometric' && isInside && isoCoords && (
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="text-cyan-700">ISO:</span>
            <span>U: {isoCoords.u}, V: {isoCoords.v}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600">TAM:</span>
          <span className="text-zinc-400">{engine.document.width} × {engine.document.height}px</span>
        </div>
      </div>

      {/* Right: Quick shortcuts guide */}
      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">Espaço</kbd> Pan</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">Scroll</kbd> Zoom</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">Ctrl+Z</kbd> Undo</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">B</kbd> Pincel</span>
        <span><kbd className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">C</kbd> Bloco 3D</span>
      </div>
    </footer>
  );
};
