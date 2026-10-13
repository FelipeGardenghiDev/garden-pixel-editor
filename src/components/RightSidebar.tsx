import React, { useState, useEffect } from 'react';
import { 
  Palette as PaletteIcon, Eye, EyeOff, Plus, Trash2, Info, Sparkles, Layers, Upload 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { PRESET_PALETTES } from '../core/palettes';
import type { Palette } from '../core/types';
import { PaletteModal } from './PaletteModal';

interface RightSidebarProps {
  engine: EditorEngine;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ engine }) => {
  const [customPalettes, setCustomPalettes] = useState<Palette[]>(() => {
    try {
      const saved = localStorage.getItem('garden_custom_palettes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('pico-8');
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('garden_custom_palettes', JSON.stringify(customPalettes));
    } catch {
      // localStorage may fail in restricted contexts
    }
  }, [customPalettes]);

  const allPalettes = [...PRESET_PALETTES, ...customPalettes];
  const currentPalette = allPalettes.find(p => p.id === selectedPaletteId) || allPalettes[0];

  const handlePaletteImported = (newPal: Palette) => {
    setCustomPalettes(prev => [newPal, ...prev]);
    setSelectedPaletteId(newPal.id);
    if (newPal.colors.length > 0) {
      engine.setColor(newPal.colors[0]);
    }
  };

  return (
    <>
      <aside className="w-64 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full select-none shrink-0 overflow-y-auto">
        {/* 1. Color Picker & Palette Section */}
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <PaletteIcon className="w-3.5 h-3.5 text-cyan-400" />
              Paleta
            </span>

            <div className="flex items-center gap-1">
              <select
                value={selectedPaletteId}
                onChange={(e) => setSelectedPaletteId(e.target.value)}
                className="bg-zinc-950 text-zinc-300 text-xs border border-zinc-800 rounded px-1.5 py-0.5 outline-none focus:border-cyan-500 max-w-28 truncate"
              >
                <optgroup label="Embutidas">
                  {PRESET_PALETTES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                {customPalettes.length > 0 && (
                  <optgroup label="Personalizadas">
                    {customPalettes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                onClick={() => setIsPaletteModalOpen(true)}
                className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-colors"
                title="Importar ou Exportar Paleta (.hex, .gpl, imagem)"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        {/* Current Color Indicator */}
        <div className="flex items-center gap-2 mb-3 bg-zinc-950 p-2 rounded-lg border border-zinc-800/80">
          <div
            className="w-8 h-8 rounded-md border border-zinc-700 shadow-inner shrink-0"
            style={{ backgroundColor: engine.primaryColor }}
          />
          <div className="flex-1">
            <div className="text-[10px] uppercase font-mono text-zinc-400">Hexadecimal</div>
            <input
              type="text"
              value={engine.primaryColor}
              onChange={(e) => engine.setColor(e.target.value)}
              className="w-full bg-transparent text-xs font-mono font-semibold text-zinc-200 outline-none uppercase"
            />
          </div>
        </div>

        {/* Swatches Grid */}
        <div className="grid grid-cols-8 gap-1.5 p-1 bg-zinc-950/60 rounded-lg border border-zinc-800/50">
          {currentPalette.colors.map((hex, idx) => {
            const isCurrent = engine.primaryColor.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={`${hex}-${idx}`}
                onClick={() => engine.setColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-5 h-5 rounded-sm transition-transform ${
                  isCurrent
                    ? 'ring-2 ring-white scale-110 shadow-md z-10'
                    : 'hover:scale-105 opacity-90 hover:opacity-100'
                }`}
                title={hex}
              />
            );
          })}
        </div>
      </div>

      {/* 2. Layers Panel */}
      <div className="p-3 border-b border-zinc-800 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Camadas
          </span>
          <button
            onClick={() => engine.document.addLayer()}
            className="p-1 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
            title="Nova Camada"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {engine.document.layers.map((layer) => {
            const isSelected = engine.document.activeLayerId === layer.id;
            return (
              <div
                key={layer.id}
                onClick={() => {
                  engine.document.activeLayerId = layer.id;
                  engine.notifyState();
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-zinc-800 border-zinc-700 text-white font-medium'
                    : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      engine.document.toggleLayerVisibility(layer.id);
                    }}
                    className="p-0.5 text-zinc-400 hover:text-white"
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                  </button>
                  <span className="text-xs">{layer.name}</span>
                </div>

                {engine.document.layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      engine.document.deleteLayer(layer.id);
                    }}
                    className="p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    title="Excluir Camada"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Style Assistant (Dynamic context help based on projection mode) */}
      <div className="p-3 bg-zinc-950/40">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Assistente de Estilo</span>
        </div>

        {engine.projectionMode === 'isometric' && (
          <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200/90 leading-relaxed flex flex-col gap-1.5">
            <div className="font-semibold text-cyan-300 flex items-center gap-1">
              <Info className="w-3 h-3" /> Projeção Isométrica 2:1
            </div>
            <p>
              O motor trava linhas nos eixos <strong className="text-white">±26.56° (ratio 2:1)</strong> e vertical <strong className="text-white">90°</strong> para evitar pixels desalinhados (<em>jaggies</em>).
            </p>
            <p className="text-[10px] text-cyan-300/80">
              💡 Use a ferramenta <strong>Bloco 3D (C)</strong> para gerar prismas isométricos com 3 tons automáticos de luz e sombra!
            </p>
          </div>
        )}

        {engine.projectionMode === 'wrap' && (
          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200/90 leading-relaxed flex flex-col gap-1.5">
            <div className="font-semibold text-amber-300 flex items-center gap-1">
              <Info className="w-3 h-3" /> Tileset Wrap Contínuo
            </div>
            <p>
              Traços de pincel que ultrapassam as bordas dobram instantaneamente para o lado oposto.
            </p>
            <p className="text-[10px] text-amber-300/80">
              💡 As cópias translúcidas ao redor mostram em tempo real como o padrão se repete em um grid 3×3.
            </p>
          </div>
        )}

        {engine.projectionMode === 'ortho' && (
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed flex flex-col gap-1.5">
            <div className="font-semibold text-zinc-200 flex items-center gap-1">
              <Info className="w-3 h-3" /> 2D Ortográfico
            </div>
            <p>
              Pincel e traçado livre 1:1. Segure <kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px]">Shift</kbd> com a ferramenta de Linha para travar em 0°, 45° ou 90°.
            </p>
          </div>
        )}
      </div>
    </aside>

    <PaletteModal
      isOpen={isPaletteModalOpen}
      onClose={() => setIsPaletteModalOpen(false)}
      currentPalette={currentPalette}
      onPaletteImported={handlePaletteImported}
    />
  </>
);
};
