import React, { useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Plus, Copy, Trash2, Layers, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';

interface TimelineProps {
  engine: EditorEngine;
}

interface FrameThumbnailProps {
  engine: EditorEngine;
  frameIndex: number;
  size?: number;
}

const FrameThumbnail: React.FC<FrameThumbnailProps> = ({ engine, frameIndex, size = 36 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const doc = engine.document;
    const docW = doc.width;
    const docH = doc.height;

    // 1. Draw checkerboard transparency
    ctx.clearRect(0, 0, size, size);
    const chkSize = 4;
    for (let y = 0; y < size; y += chkSize) {
      for (let x = 0; x < size; x += chkSize) {
        const isEven = (Math.floor(x / chkSize) + Math.floor(y / chkSize)) % 2 === 0;
        ctx.fillStyle = isEven ? '#27272a' : '#18181b';
        ctx.fillRect(x, y, chkSize, chkSize);
      }
    }

    // 2. Composite frame pixels
    const composite = doc.composite(undefined, frameIndex);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = docW;
    tempCanvas.height = docH;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const imgData = tempCtx.createImageData(docW, docH);
      new Uint32Array(imgData.data.buffer).set(composite.data);
      tempCtx.putImageData(imgData, 0, 0);

      // 3. Draw scaled without anti-aliasing
      ctx.imageSmoothingEnabled = false;
      const scale = Math.min(size / docW, size / docH);
      const renderW = Math.max(1, Math.round(docW * scale));
      const renderH = Math.max(1, Math.round(docH * scale));
      const offX = Math.round((size - renderW) / 2);
      const offY = Math.round((size - renderH) / 2);

      ctx.drawImage(tempCanvas, offX, offY, renderW, renderH);
    }
  }, [engine, frameIndex, size, engine.document.width, engine.document.height, engine.document.frames]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded bg-zinc-950 shrink-0 shadow-inner pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export const Timeline: React.FC<TimelineProps> = ({ engine }) => {
  const doc = engine.document;
  const frames = doc.frames;
  const currentIdx = doc.activeFrameIndex;

  return (
    <div className="h-18 bg-zinc-950/95 border-t border-zinc-800/80 px-4 flex items-center justify-between select-none shrink-0 z-20 backdrop-blur-xs">
      {/* Left: Playback & Frame Stepper */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => engine.togglePlay()}
          className={`p-2 rounded-xl flex items-center justify-center transition-all ${
            engine.isPlaying
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-bold'
              : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-700/60'
          }`}
          title={engine.isPlaying ? 'Pausar Animação (Espaço)' : 'Reproduzir Animação'}
        >
          {engine.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => engine.prevFrame()}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-900 transition-colors"
          title="Quadro Anterior (,)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-semibold text-zinc-300 min-w-14 text-center">
          {currentIdx + 1} / {frames.length}
        </span>

        <button
          onClick={() => engine.nextFrame()}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-900 transition-colors"
          title="Próximo Quadro (.)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-zinc-800 mx-1" />

        {/* FPS control */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
          <span className="text-zinc-500 text-[10px] font-mono">FPS:</span>
          <select
            value={engine.fps}
            onChange={(e) => engine.setFps(Number(e.target.value))}
            className="bg-transparent text-cyan-400 font-mono font-semibold outline-none cursor-pointer"
          >
            {[1, 2, 4, 6, 8, 12, 16, 24].map((f) => (
              <option key={f} value={f} className="bg-zinc-900 text-zinc-200">
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Onion Skinning toggle */}
        <button
          onClick={() => engine.toggleOnionSkinning()}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all border ${
            engine.onionSkinning
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60 shadow-sm'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
          }`}
          title="Alternar Onion Skinning (Fantasma do quadro anterior/seguinte)"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Onion Skin</span>
        </button>
      </div>

      {/* Center: Frame Filmstrip with Real Live Thumbnails */}
      <div className="flex-1 max-w-xl mx-4 flex items-center gap-2 overflow-x-auto py-1 px-1">
        {frames.map((frame, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={frame.id}
              className={`relative group flex items-center rounded-xl p-1 border transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyan-950/60 border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950/60'
                  : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850'
              }`}
              onClick={() => engine.setFrame(idx)}
            >
              {/* Thumbnail */}
              <FrameThumbnail engine={engine} frameIndex={idx} size={40} />

              {/* Frame Number badge */}
              <div className="flex flex-col items-center justify-center px-1.5 min-w-6">
                <span className="text-[9px] uppercase font-mono text-zinc-500 leading-none">Q</span>
                <span className={`font-mono text-xs font-bold leading-tight ${isActive ? 'text-cyan-300' : 'text-zinc-300'}`}>
                  {idx + 1}
                </span>
              </div>

              {/* Reorder controls on hover */}
              {frames.length > 1 && (
                <div className="absolute -top-3 right-0 hidden group-hover:flex items-center gap-0.5 bg-zinc-900 border border-zinc-700 rounded-md p-0.5 shadow-lg z-30">
                  {idx > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        engine.moveFrame(idx, idx - 1);
                      }}
                      className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                      title="Mover quadro para a esquerda"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}
                  {idx < frames.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        engine.moveFrame(idx, idx + 1);
                      }}
                      className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                      title="Mover quadro para a direita"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Frame Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => engine.addFrame(false)}
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1 text-xs transition-all"
          title="Novo Quadro em Branco"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Novo</span>
        </button>

        <button
          onClick={() => engine.duplicateFrame()}
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1 text-xs transition-all"
          title="Duplicar Quadro Atual"
        >
          <Copy className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Duplicar</span>
        </button>

        {frames.length > 1 && (
          <button
            onClick={() => engine.deleteFrame()}
            className="p-1.5 bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 rounded-lg border border-zinc-800 hover:border-rose-800/60 transition-all"
            title="Excluir Quadro Atual"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
