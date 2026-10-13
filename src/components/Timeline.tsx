import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Plus, Copy, Trash2, Layers 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';

interface TimelineProps {
  engine: EditorEngine;
}

export const Timeline: React.FC<TimelineProps> = ({ engine }) => {
  const doc = engine.document;
  const frames = doc.frames;
  const currentIdx = doc.activeFrameIndex;

  return (
    <div className="h-16 bg-zinc-950/95 border-t border-zinc-800/80 px-4 flex items-center justify-between select-none shrink-0 z-20 backdrop-blur-xs">
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

      {/* Center: Frame Filmstrip */}
      <div className="flex-1 max-w-xl mx-4 flex items-center gap-1.5 overflow-x-auto py-1">
        {frames.map((frame, idx) => {
          const isActive = idx === currentIdx;
          return (
            <button
              key={frame.id}
              onClick={() => engine.setFrame(idx)}
              className={`h-10 min-w-12 px-2.5 rounded-lg border flex flex-col items-center justify-center text-xs transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-md shadow-cyan-600/30 ring-1 ring-cyan-300'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] uppercase font-mono opacity-80 leading-none">Q</span>
              <span className="font-mono text-xs leading-tight">{idx + 1}</span>
            </button>
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
