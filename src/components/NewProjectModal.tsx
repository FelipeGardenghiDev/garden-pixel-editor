import React, { useState } from 'react';
import { 
  X, FilePlus, Maximize2, Compass, Box, Repeat, Lock, Unlock, Check, AlertCircle 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import type { ProjectionMode } from '../core/types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

interface CanvasPreset {
  name: string;
  width: number;
  height: number;
  description: string;
}

const PRESETS: CanvasPreset[] = [
  { name: '16 × 16', width: 16, height: 16, description: 'Ícones, itens e tiles pequenos' },
  { name: '24 × 24', width: 24, height: 24, description: 'Sprites retrô 8-bit' },
  { name: '32 × 32', width: 32, height: 32, description: 'Padrão clássico 16-bit / GBA' },
  { name: '48 × 48', width: 48, height: 48, description: 'Tamanho padrão do Garden' },
  { name: '64 × 64', width: 64, height: 64, description: 'Retratos e personagens detalhados' },
  { name: '128 × 128', width: 128, height: 128, description: 'Cenários e ilustrações' },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, engine }) => {
  const [tab, setTab] = useState<'new' | 'resize'>('new');

  // New Project State
  const [width, setWidth] = useState<number>(engine.document.width);
  const [height, setHeight] = useState<number>(engine.document.height);
  const [mode, setMode] = useState<ProjectionMode>(engine.projectionMode);
  const [lockRatio, setLockRatio] = useState<boolean>(true);

  // Resize Canvas State
  const [resizeWidth, setResizeWidth] = useState<number>(engine.document.width);
  const [resizeHeight, setResizeHeight] = useState<number>(engine.document.height);
  const [anchor, setAnchor] = useState<'top-left' | 'center'>('center');

  if (!isOpen) return null;

  const handleApplyPreset = (preset: CanvasPreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleWidthChange = (val: number) => {
    const clamped = Math.max(8, Math.min(256, val));
    setWidth(clamped);
    if (lockRatio) setHeight(clamped);
  };

  const handleHeightChange = (val: number) => {
    const clamped = Math.max(8, Math.min(256, val));
    setHeight(clamped);
    if (lockRatio) setWidth(clamped);
  };

  const handleCreateProject = () => {
    if (confirm('Criar um novo projeto descartará as alterações não salvas. Deseja continuar?')) {
      engine.newProject(width, height, mode);
      onClose();
    }
  };

  const handleResizeCanvas = () => {
    engine.resizeCanvas(resizeWidth, resizeHeight, anchor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              {tab === 'new' ? <FilePlus className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {tab === 'new' ? 'Novo Projeto' : 'Redimensionar Canvas'}
              </h2>
              <p className="text-xs text-zinc-400">
                {tab === 'new' 
                  ? 'Configure as dimensões e o estilo de projeção inicial' 
                  : 'Altere as dimensões mantendo seus pixels existentes intactos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 px-5 bg-zinc-950/40">
          <button
            onClick={() => setTab('new')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              tab === 'new'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            Novo Projeto
          </button>
          <button
            onClick={() => {
              setTab('resize');
              setResizeWidth(engine.document.width);
              setResizeHeight(engine.document.height);
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              tab === 'resize'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Redimensionar Canvas Atual
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {tab === 'new' ? (
            <>
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Tamanhos Pré-definidos
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((preset) => {
                    const isSelected = width === preset.width && height === preset.height;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200 shadow-sm'
                            : 'bg-zinc-950/50 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                        }`}
                      >
                        <span className="font-mono font-bold text-xs">{preset.name}</span>
                        <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Dimensions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Dimensões Customizadas (8 a 256px)
                  </label>
                  <button
                    onClick={() => setLockRatio(!lockRatio)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      lockRatio
                        ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Travar proporção 1:1"
                  >
                    {lockRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>1:1</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 mb-1 block">Largura (W)</span>
                    <input
                      type="number"
                      min={8}
                      max={256}
                      value={width}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value) || 8)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 mb-1 block">Altura (H)</span>
                    <input
                      type="number"
                      min={8}
                      max={256}
                      value={height}
                      onChange={(e) => handleHeightChange(parseInt(e.target.value) || 8)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Projection Mode */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Modo de Projeção Inicial
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('isometric')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      mode === 'isometric'
                        ? 'bg-cyan-950/60 border-cyan-600 text-cyan-200'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-medium">Isométrico 2:1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('wrap')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      mode === 'wrap'
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Repeat className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium">Tileset Wrap</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('ortho')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      mode === 'ortho'
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-medium">2D Padrão</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Resize Existing Canvas */}
              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Redimensionar a tela preserva seus desenhos em todas as camadas e frames. Se as novas dimensões forem menores, os pixels excedentes serão recortados.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-mono text-zinc-400 mb-1 block">Nova Largura (px)</span>
                  <input
                    type="number"
                    min={8}
                    max={256}
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(Math.max(8, Math.min(256, parseInt(e.target.value) || 8)))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-zinc-400 mb-1 block">Nova Altura (px)</span>
                  <input
                    type="number"
                    min={8}
                    max={256}
                    value={resizeHeight}
                    onChange={(e) => setResizeHeight(Math.max(8, Math.min(256, parseInt(e.target.value) || 8)))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Anchor Position */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Posição da Âncora
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAnchor('center')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      anchor === 'center'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Centralizado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnchor('top-left')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      anchor === 'top-left'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Canto Superior Esquerdo</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </button>
          {tab === 'new' ? (
            <button
              onClick={handleCreateProject}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-950/60 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Criar Projeto ({width}×{height})
            </button>
          ) : (
            <button
              onClick={handleResizeCanvas}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-cyan-950/60 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar ({resizeWidth}×{resizeHeight})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
