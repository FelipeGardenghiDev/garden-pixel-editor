import React, { useState } from 'react';
import { X, RefreshCw, Check } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';

interface ColorSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

export const ColorSwapModal: React.FC<ColorSwapModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const [fromHex, setFromHex] = useState<string>(engine.primaryColor);
  const [toHex, setToHex] = useState<string>('#FFFFFF');
  const paletteColors = engine.document.activePalette.colors;

  if (!isOpen) return null;

  const handleApply = () => {
    engine.swapColor(fromHex, toHex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-sm text-zinc-100">Substituir Cor (Color Swap)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {engine.selectionRect && (
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-cyan-200 text-xs">
              💡 Substituição será aplicada <strong>apenas na área selecionada</strong>.
            </div>
          )}

          {/* Color From */}
          <div className="flex flex-col gap-1.5">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              Cor a Substituir (Origem):
            </span>
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <div
                className="w-8 h-8 rounded-lg border border-zinc-700 shadow-inner shrink-0"
                style={{ backgroundColor: fromHex }}
              />
              <input
                type="text"
                value={fromHex}
                onChange={(e) => setFromHex(e.target.value)}
                className="flex-1 bg-transparent font-mono font-semibold text-zinc-100 uppercase outline-none"
              />
            </div>
          </div>

          {/* Color To */}
          <div className="flex flex-col gap-1.5">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              Nova Cor (Destino):
            </span>
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <div
                className="w-8 h-8 rounded-lg border border-zinc-700 shadow-inner shrink-0"
                style={{ backgroundColor: toHex }}
              />
              <input
                type="text"
                value={toHex}
                onChange={(e) => setToHex(e.target.value)}
                className="flex-1 bg-transparent font-mono font-semibold text-zinc-100 uppercase outline-none"
              />
            </div>
          </div>

          {/* Palette Swatches helper */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800">
            <span className="text-zinc-500 text-[11px]">Escolher da Paleta Ativa:</span>
            <div className="grid grid-cols-8 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800/60 max-h-24 overflow-y-auto">
              {paletteColors.map((hex, i) => (
                <button
                  key={`${hex}-${i}`}
                  onClick={() => setToHex(hex)}
                  style={{ backgroundColor: hex }}
                  className="w-6 h-6 rounded-sm border border-black/30 hover:scale-105 transition-transform"
                  title={`Escolher ${hex} como destino`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full mt-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/40 transition-colors"
          >
            <Check className="w-4 h-4" />
            Aplicar Substituição
          </button>
        </div>
      </div>
    </div>
  );
};
