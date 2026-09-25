import React from 'react';
import { 
  Pencil, Eraser, Minus, Square, Box, PaintBucket, Pipette 
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
    { id: 'pencil', label: 'Lápis', icon: Pencil, hotkey: 'B' },
    { id: 'eraser', label: 'Borracha', icon: Eraser, hotkey: 'E' },
    { id: 'line', label: 'Reta', icon: Minus, hotkey: 'L', highlightInIso: true },
    { id: 'rectangle', label: 'Retângulo 2D', icon: Square, hotkey: 'R' },
    { id: 'isocube', label: 'Bloco 3D Isométrico', icon: Box, hotkey: 'C', highlightInIso: true },
    { id: 'bucket', label: 'Balde de Tinta', icon: PaintBucket, hotkey: 'G' },
    { id: 'picker', label: 'Conta-gotas', icon: Pipette, hotkey: 'I' },
  ];

  return (
    <aside className="w-14 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-3 gap-2 shrink-0 select-none z-10">
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
    </aside>
  );
};
