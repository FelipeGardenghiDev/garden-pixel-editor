import React from 'react';
import { 
  SquareDashed, Pencil, Grid2X2, Eraser, Minus, Square, Circle, 
  Box, Triangle, Cylinder, PaintBucket, Pipette,
  FlipHorizontal, FlipVertical, ArrowLeftRight, Undo2, Redo2
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import type { ToolType } from '../core/types';

interface ToolBarProps {
  engine: EditorEngine;
  onOpenPalette?: () => void;
}

interface ToolItem {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  highlightInIso?: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({ engine, onOpenPalette }) => {
  const tools: ToolItem[] = [
    { id: 'pencil', label: 'Lápis', icon: Pencil, hotkey: 'B' },
    { id: 'eraser', label: 'Borracha', icon: Eraser, hotkey: 'E' },
    { id: 'bucket', label: 'Balde de Tinta', icon: PaintBucket, hotkey: 'G' },
    { id: 'picker', label: 'Conta-gotas', icon: Pipette, hotkey: 'I' },
    { id: 'dither', label: 'Pincel Dithering', icon: Grid2X2, hotkey: 'D' },
    { id: 'line', label: 'Reta', icon: Minus, hotkey: 'L', highlightInIso: true },
    { id: 'rectangle', label: 'Retângulo 2D', icon: Square, hotkey: 'R' },
    { id: 'circle', label: 'Círculo / Elipse', icon: Circle, hotkey: 'O' },
    { id: 'isocube', label: 'Bloco 3D Isométrico', icon: Box, hotkey: 'C', highlightInIso: true },
    { id: 'isocylinder', label: 'Cilindro Isométrico', icon: Cylinder, hotkey: 'Y', highlightInIso: true },
    { id: 'isoramp', label: 'Rampa / Telhado Iso', icon: Triangle, hotkey: 'P', highlightInIso: true },
    { id: 'select', label: 'Seleção Marquee', icon: SquareDashed, hotkey: 'M' },
  ];

  return (
    <aside 
      className="w-13 sm:w-14 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 gap-1 sm:gap-1.5 shrink-0 select-none z-10 overflow-y-auto"
      aria-label="Barra de Ferramentas"
    >
      {/* 1. Mobile Quick Thumb Undo / Redo */}
      <div className="flex md:hidden flex-col items-center gap-1 w-full pb-1 border-b border-zinc-800">
        <button
          disabled={!engine.history.canUndo}
          onClick={() => engine.history.undo()}
          className="w-9 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 disabled:opacity-25 transition-all bg-zinc-950/80 border border-zinc-800"
          title="Desfazer"
          aria-label="Desfazer"
        >
          <Undo2 className="w-4 h-4 text-cyan-400 disabled:text-zinc-600" />
        </button>
        <button
          disabled={!engine.history.canRedo}
          onClick={() => engine.history.redo()}
          className="w-9 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 disabled:opacity-25 transition-all bg-zinc-950/80 border border-zinc-800"
          title="Refazer"
          aria-label="Refazer"
        >
          <Redo2 className="w-4 h-4 text-cyan-400 disabled:text-zinc-600" />
        </button>
      </div>

      {/* 2. Color Swatches (Primary & Secondary) */}
      <div className="flex flex-col items-center gap-0.5 py-1">
        <div className="relative w-8 h-8">
          {/* Secondary Color (Back) */}
          <div 
            className="absolute bottom-0 right-0 w-5 h-5 rounded-md border border-zinc-700 shadow-sm cursor-pointer z-0 transition-transform hover:scale-105"
            style={{ backgroundColor: engine.secondaryColor }}
            onClick={() => engine.swapColors()}
            title={`Cor Secundária: ${engine.secondaryColor} (Clique para alternar)`}
          />
          {/* Primary Color (Front) */}
          <div 
            className="absolute top-0 left-0 w-6 h-6 rounded-md border-2 border-zinc-900 ring-1 ring-zinc-600 shadow-md cursor-pointer z-10 transition-transform active:scale-95 hover:scale-105"
            style={{ backgroundColor: engine.primaryColor }}
            onClick={() => onOpenPalette ? onOpenPalette() : engine.swapColors()}
            title={`Cor Primária: ${engine.primaryColor} (Clique para abrir paleta)`}
          />
        </div>
        <button
          onClick={() => engine.swapColors()}
          className="p-1 text-zinc-500 hover:text-cyan-300 rounded transition-colors"
          title="Alternar cores primária/secundária (X)"
          aria-label="Alternar cores"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
      </div>

      <div className="w-7 h-px bg-zinc-800 my-0.5" />

      {/* 3. Drawing Tools */}
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = engine.currentTool === t.id;
        const isIsoFeatured = engine.projectionMode === 'isometric' && t.highlightInIso;

        return (
          <button
            key={t.id}
            onClick={() => engine.setTool(t.id)}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/25 font-bold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 active:bg-zinc-800'
            }`}
            title={`${t.label} (${t.hotkey})`}
            aria-label={`${t.label} (Atalho: ${t.hotkey})`}
          >
            <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            
            {/* Small badge if it's specialized for Isometric */}
            {isIsoFeatured && !isActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-zinc-900 ring-1 ring-cyan-500/50" />
            )}

            <span className="sr-only">{t.label}</span>
          </button>
        );
      })}

      <div className="w-7 h-px bg-zinc-800 my-1" />

      {/* 4. Quick Transformations */}
      <button
        onClick={() => engine.flipHorizontal()}
        className="w-9 h-8 sm:w-10 sm:h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 transition-all"
        title="Espelhar / Inverter Horizontal (Seleção ou Camada)"
        aria-label="Espelhar Horizontal"
      >
        <FlipHorizontal className="w-4 h-4" />
      </button>

      <button
        onClick={() => engine.flipVertical()}
        className="w-9 h-8 sm:w-10 sm:h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 transition-all"
        title="Espelhar / Inverter Vertical (Seleção ou Camada)"
        aria-label="Espelhar Vertical"
      >
        <FlipVertical className="w-4 h-4" />
      </button>
    </aside>
  );
};
