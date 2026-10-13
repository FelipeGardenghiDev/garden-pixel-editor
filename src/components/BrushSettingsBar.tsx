import React, { useState } from 'react';
import { 
  Check, SunDim, SunMedium, RefreshCw 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import type { DitherMode } from '../core/types';
import { ColorSwapModal } from './ColorSwapModal';

interface BrushSettingsBarProps {
  engine: EditorEngine;
}

export const BrushSettingsBar: React.FC<BrushSettingsBarProps> = ({ engine }) => {
  const [isColorSwapOpen, setIsColorSwapOpen] = useState<boolean>(false);

  return (
    <>
      <div className="h-9 bg-zinc-900/90 border-b border-zinc-800/80 px-4 flex items-center justify-between text-xs select-none shrink-0 z-10 backdrop-blur-xs">
        {/* Left: Brush Size & Pixel-Perfect */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 font-mono">TAM:</span>
            <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              {[1, 2, 3, 4].map((sz) => (
                <button
                  key={sz}
                  onClick={() => engine.setBrushSize(sz)}
                  className={`w-5 h-5 rounded font-mono text-[11px] font-bold flex items-center justify-center transition-colors ${
                    engine.brushSize === sz
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`Pincel ${sz}px`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Pixel-Perfect Toggle */}
          <button
            onClick={() => engine.togglePixelPerfect()}
            className={`px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1 transition-all border ${
              engine.pixelPerfect
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 shadow-xs'
                : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
            title="Remove cantos duplos para traços de pixel art perfeitamente nítidos"
          >
            {engine.pixelPerfect && <Check className="w-3 h-3 text-emerald-400" />}
            Pixel-Perfect
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Dithering Pattern Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 font-mono">DITHER:</span>
            <select
              value={engine.ditherMode}
              onChange={(e) => engine.setDitherMode(e.target.value as DitherMode)}
              className="bg-zinc-950 text-zinc-300 text-[11px] border border-zinc-800 rounded px-1.5 py-0.5 outline-none focus:border-cyan-500 font-medium"
            >
              <option value="none">Nenhum (Sólido)</option>
              <option value="checker">Xadrez 50%</option>
              <option value="sparse">Esparso 25%</option>
              <option value="bayer">Bayer 2×2 (75%)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Symmetry Toggles */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 font-mono">ESPELHO:</span>
            <button
              onClick={() => engine.toggleSymmetryX()}
              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold flex items-center gap-1 transition-all border ${
                engine.symmetryX
                  ? 'bg-rose-950/60 text-rose-300 border-rose-700/60 shadow-xs'
                  : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
              title="Simetria X (Espelhamento Vertical Esquerda/Direita)"
            >
              {engine.symmetryX && <Check className="w-3 h-3 text-rose-400" />}
              X
            </button>
            <button
              onClick={() => engine.toggleSymmetryY()}
              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold flex items-center gap-1 transition-all border ${
                engine.symmetryY
                  ? 'bg-rose-950/60 text-rose-300 border-rose-700/60 shadow-xs'
                  : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
              title="Simetria Y (Espelhamento Horizontal Topo/Base)"
            >
              {engine.symmetryY && <Check className="w-3 h-3 text-rose-400" />}
              Y
            </button>
          </div>
        </div>

        {/* Right: Shading Assist & Color Swap */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 font-mono mr-1">SHADING:</span>
          
          <button
            onClick={() => engine.shadeActiveColor('darker')}
            className="p-1 px-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 flex items-center gap-1 text-[11px] transition-colors"
            title="Escurecer tom na paleta ([)"
          >
            <SunDim className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Escurecer</span>
          </button>

          <button
            onClick={() => engine.shadeActiveColor('lighter')}
            className="p-1 px-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 flex items-center gap-1 text-[11px] transition-colors"
            title="Clarear tom na paleta (])"
          >
            <SunMedium className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Clarear</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => setIsColorSwapOpen(true)}
            className="p-1 px-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 rounded border border-zinc-800 flex items-center gap-1 text-[11px] transition-colors"
            title="Substituir Cor na camada ou seleção"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Substituir Cor</span>
          </button>
        </div>
      </div>

      <ColorSwapModal
        isOpen={isColorSwapOpen}
        onClose={() => setIsColorSwapOpen(false)}
        engine={engine}
      />
    </>
  );
};
