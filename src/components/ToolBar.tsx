import React from 'react';
import { 
  SquareDashed, Pencil, Grid2X2, Eraser, Minus, Square, Circle, 
  Box, Triangle, Cylinder, PaintBucket, Pipette,
  FlipHorizontal, FlipVertical
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import type { ToolType } from '../core/types';

interface ToolBarProps {
  engine: EditorEngine;
}

interface ToolItem {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  highlightInIso?: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({ engine }) => {
  const tools: ToolItem[] = [
    { id: 'select', label: 'Seleção Marquee', icon: SquareDashed, hotkey: 'M' },
    { id: 'pencil', label: 'Lápis', icon: Pencil, hotkey: 'B' },
    { id: 'dither', label: 'Pincel Dithering', icon: Grid2X2, hotkey: 'D' },
    { id: 'eraser', label: 'Borracha', icon: Eraser, hotkey: 'E' },
    { id: 'line', label: 'Reta', icon: Minus, hotkey: 'L', highlightInIso: true },
    { id: 'rectangle', label: 'Retângulo 2D', icon: Square, hotkey: 'R' },
    { id: 'circle', label: 'Círculo / Elipse', icon: Circle, hotkey: 'O' },
    { id: 'isocube', label: 'Bloco 3D Isométrico', icon: Box, hotkey: 'C', highlightInIso: true },
    { id: 'isocylinder', label: 'Cilindro Isométrico', icon: Cylinder, hotkey: 'Y', highlightInIso: true },
    { id: 'isoramp', label: 'Rampa / Telhado Iso', icon: Triangle, hotkey: 'P', highlightInIso: true },
    { id: 'bucket', label: 'Balde de Tinta', icon: PaintBucket, hotkey: 'G' },
    { id: 'picker', label: 'Conta-gotas', icon: Pipette, hotkey: 'I' },
  ];

  return (
    <aside 
      className="w-14 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2.5 gap-1.5 shrink-0 select-none z-10 overflow-y-auto"
      aria-label="Barra de Ferramentas"
    >
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = engine.currentTool === t.id;
        const isIsoFeatured = engine.projectionMode === 'isometric' && t.highlightInIso;

        return (
          <button
            key={t.id}
            onClick={() => engine.setTool(t.id)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
            }`}
            title={`${t.label} (${t.hotkey})`}
            aria-label={`${t.label} (Atalho: ${t.hotkey})`}
          >
            <Icon className="w-5 h-5" />
            
            {/* Small badge if it's specialized for Isometric */}
            {isIsoFeatured && !isActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-zinc-900 ring-1 ring-cyan-500/50" />
            )}

            <span className="sr-only">{t.label}</span>
          </button>
        );
      })}

      <div className="w-7 h-px bg-zinc-800 my-1" />

      {/* Quick Transformations */}
      <button
        onClick={() => engine.flipHorizontal()}
        className="w-10 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 transition-all"
        title="Espelhar / Inverter Horizontal (Seleção ou Camada)"
        aria-label="Espelhar Horizontal"
      >
        <FlipHorizontal className="w-4 h-4" />
      </button>

      <button
        onClick={() => engine.flipVertical()}
        className="w-10 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 transition-all"
        title="Espelhar / Inverter Vertical (Seleção ou Camada)"
        aria-label="Espelhar Vertical"
      >
        <FlipVertical className="w-4 h-4" />
      </button>
    </aside>
  );
};
