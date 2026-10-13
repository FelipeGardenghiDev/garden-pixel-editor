import React, { useState, useRef } from 'react';
import { 
  Undo2, Redo2, Grid3X3, Download, ZoomIn, ZoomOut, 
  Compass, Box, Repeat, Sun, FileSpreadsheet, Save, FolderOpen, RotateCcw, FilePlus, Film, HelpCircle 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { exportDocumentToPng } from '../core/export';
import { NormalMapModal } from './NormalMapModal';
import { SpritesheetModal } from './SpritesheetModal';
import { NewProjectModal } from './NewProjectModal';
import { GifExportModal } from './GifExportModal';
import { downloadProjectFile, openProjectFromFile, restoreAutosave, hasAutosave } from '../core/project-file';

interface TopBarProps {
  engine: EditorEngine;
  onOpenShortcuts?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ engine, onOpenShortcuts }) => {
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isNormalMapModalOpen, setIsNormalMapModalOpen] = useState<boolean>(false);
  const [isSpritesheetModalOpen, setIsSpritesheetModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (scale: number) => {
    exportDocumentToPng(engine.document, scale, `garden_pixel_${engine.projectionMode}_${scale}x.png`);
    setShowExportMenu(false);
  };

  const handleSaveProject = () => {
    downloadProjectFile(engine, `projeto_${engine.projectionMode}.garden`);
  };

  const handleOpenFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      openProjectFromFile(engine, file);
      e.target.value = '';
    }
  };

  const handleRestore = () => {
    if (confirm('Restaurar última sessão salva automaticamente?')) {
      restoreAutosave(engine);
    }
  };

  return (
    <>
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 select-none shrink-0 z-10">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider uppercase text-zinc-100 flex items-center gap-1.5">
              Garden Pixel
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono font-semibold">
                EDITOR
              </span>
            </h1>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="text-[11px] text-zinc-500 hover:text-cyan-400 font-mono transition-colors text-left flex items-center gap-1 group"
              title="Clique para redimensionar o canvas"
            >
              <span>{engine.document.width} × {engine.document.height}px</span>
              <span className="text-[9px] text-zinc-600 group-hover:text-cyan-500">⚙</span>
            </button>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800 mx-1" />

        {/* Project Save / Load / New actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="p-1.5 px-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-white rounded-lg border border-cyan-800/60 flex items-center gap-1.5 text-xs transition-colors"
            title="Novo Projeto ou Redimensionar Canvas"
          >
            <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-medium">Novo</span>
          </button>

          <button
            onClick={handleSaveProject}
            className="p-1.5 px-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs transition-colors"
            title="Salvar Projeto (.garden) - Ctrl+S"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline font-medium">Salvar</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 px-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs transition-colors"
            title="Abrir Projeto (.garden) - Ctrl+O"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline font-medium">Abrir</span>
          </button>

          {hasAutosave() && (
            <button
              onClick={handleRestore}
              className="p-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 rounded-lg border border-zinc-800 transition-colors"
              title="Restaurar Autosave anterior"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".garden,.json"
            onChange={handleOpenFileChange}
            className="hidden"
          />
        </div>

        <div className="h-6 w-px bg-zinc-800 mx-1" />

        {/* Projection Mode Switcher */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
          <button
            onClick={() => engine.setProjectionMode('ortho')}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              engine.projectionMode === 'ortho'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Modo 2D Clássico (Ortográfico)"
          >
            <Compass className="w-3.5 h-3.5" />
            2D Padrão
          </button>

          <button
            onClick={() => engine.setProjectionMode('isometric')}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              engine.projectionMode === 'isometric'
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 shadow-sm'
                : 'text-zinc-400 hover:text-cyan-300'
            }`}
            title="Modo Isométrico 2:1 (Guias e travas angulares)"
          >
            <Box className="w-3.5 h-3.5" />
            Isométrico 2:1
          </button>

          <button
            onClick={() => engine.setProjectionMode('wrap')}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              engine.projectionMode === 'wrap'
                ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50 shadow-sm'
                : 'text-zinc-400 hover:text-amber-300'
            }`}
            title="Modo Tileset Seamless (Repetição 3x3)"
          >
            <Repeat className="w-3.5 h-3.5" />
            Tileset Wrap
          </button>
        </div>
      </div>

      {/* Center: History & View Controls */}
      <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800">
        <button
          disabled={!engine.history.canUndo}
          onClick={() => engine.history.undo()}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          disabled={!engine.history.canRedo}
          onClick={() => engine.history.redo()}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* Pixel Grid Toggle */}
        <button
          onClick={() => engine.togglePixelGrid()}
          className={`p-1.5 rounded transition-colors ${
            engine.showPixelGrid ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Alternar Grid de Pixels"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>

        {/* Iso Grid Toggle */}
        <button
          onClick={() => engine.toggleIsoGrid()}
          className={`p-1.5 rounded transition-colors ${
            engine.showIsoGrid && engine.projectionMode === 'isometric'
              ? 'bg-cyan-900/60 text-cyan-300'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Alternar Grid Isométrico 2:1"
        >
          <Box className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() => engine.viewport.setZoom(engine.viewport.zoom - 2)}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-semibold px-1 text-zinc-300 min-w-12 text-center">
          {engine.viewport.zoom}x
        </span>
        <button
          onClick={() => engine.viewport.setZoom(engine.viewport.zoom + 2)}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Tools & Export Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsNormalMapModalOpen(true)}
          className="flex items-center gap-1.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 font-medium text-xs px-2.5 py-1.5 rounded-lg transition-all"
          title="Gerar Normal Map e prévia de iluminação dinâmica 2.5D"
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Luz 2.5D</span>
        </button>

        <button
          onClick={() => setIsSpritesheetModalOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 font-medium text-xs px-2.5 py-1.5 rounded-lg transition-all"
          title="Exportar Spritesheet e Atlas JSON"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Atlas</span>
        </button>

        <button
          onClick={() => setIsGifModalOpen(true)}
          className="flex items-center gap-1.5 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/60 font-medium text-xs px-2.5 py-1.5 rounded-lg transition-all"
          title="Exportar GIF Animado"
        >
          <Film className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">GIF</span>
        </button>

        <div className="h-5 w-px bg-zinc-800 mx-0.5" />

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar PNG
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-10 w-44 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl p-1 z-50 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-1">
                Escala de Exportação
              </span>
              {[1, 2, 4, 8, 16].map((scale) => (
                <button
                  key={scale}
                  onClick={() => handleExport(scale)}
                  className="text-left px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 rounded font-mono flex items-center justify-between transition-colors"
                >
                  <span>{scale}x ({engine.document.width * scale}×{engine.document.height * scale}px)</span>
                  {scale === 4 && <span className="text-[10px] text-cyan-400 font-sans">Ideal</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded-lg transition-colors ml-1"
          title="Atalhos de Teclado (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>

    <NormalMapModal
      isOpen={isNormalMapModalOpen}
      onClose={() => setIsNormalMapModalOpen(false)}
      engine={engine}
    />

    <SpritesheetModal
      isOpen={isSpritesheetModalOpen}
      onClose={() => setIsSpritesheetModalOpen(false)}
      engine={engine}
    />

    <NewProjectModal
      isOpen={isNewProjectModalOpen}
      onClose={() => setIsNewProjectModalOpen(false)}
      engine={engine}
    />

    <GifExportModal
      isOpen={isGifModalOpen}
      onClose={() => setIsGifModalOpen(false)}
      engine={engine}
    />
  </>
);
};
