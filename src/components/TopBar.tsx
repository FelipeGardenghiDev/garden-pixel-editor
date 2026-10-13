import React, { useState, useRef } from 'react';
import { 
  Undo2, Redo2, Grid3X3, Download, ZoomIn, ZoomOut, 
  Compass, Box, Repeat, Sun, FileSpreadsheet, Save, FolderOpen, RotateCcw, FilePlus, Film, HelpCircle, Code2, ChevronDown, Layers 
} from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { exportDocumentToPng } from '../core/export';
import { NormalMapModal } from './NormalMapModal';
import { SpritesheetModal } from './SpritesheetModal';
import { NewProjectModal } from './NewProjectModal';
import { GifExportModal } from './GifExportModal';
import { CodeExportModal } from './CodeExportModal';
import { downloadProjectFile, openProjectFromFile, restoreAutosave, hasAutosave } from '../core/project-file';

interface TopBarProps {
  engine: EditorEngine;
  onOpenShortcuts?: () => void;
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ engine, onOpenShortcuts, onToggleSidebar }) => {
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isNormalMapModalOpen, setIsNormalMapModalOpen] = useState<boolean>(false);
  const [isSpritesheetModalOpen, setIsSpritesheetModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
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
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 md:px-4 select-none shrink-0 z-20 gap-2">
        {/* Left Section: Brand & Project Actions */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xs sm:text-sm tracking-wider uppercase text-zinc-100 flex items-center gap-1.5">
                Garden Pixel
                <span className="hidden sm:inline text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono font-semibold">
                  EDITOR
                </span>
              </h1>
              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="text-[10px] sm:text-[11px] text-zinc-500 hover:text-cyan-400 font-mono transition-colors text-left flex items-center gap-1 group"
                title="Clique para redimensionar o canvas"
                aria-label="Redimensionar canvas"
              >
                <span>{engine.document.width} × {engine.document.height}px</span>
                <span className="text-[9px] text-zinc-600 group-hover:text-cyan-500">⚙</span>
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-0.5 sm:mx-1" />

          {/* Project File Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="p-1.5 sm:px-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-white rounded-lg border border-cyan-800/60 flex items-center gap-1.5 text-xs transition-colors"
              title="Novo Projeto ou Redimensionar Canvas"
              aria-label="Novo Projeto"
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline font-medium">Novo</span>
            </button>

            <button
              onClick={handleSaveProject}
              className="p-1.5 sm:px-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs transition-colors"
              title="Salvar Projeto (.garden) - Ctrl+S"
              aria-label="Salvar Projeto"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline font-medium">Salvar</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 sm:px-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs transition-colors"
              title="Abrir Projeto (.garden) - Ctrl+O"
              aria-label="Abrir Projeto"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline font-medium">Abrir</span>
            </button>

            {hasAutosave() && (
              <button
                onClick={handleRestore}
                className="p-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 rounded-lg border border-zinc-800 transition-colors"
                title="Restaurar Autosave anterior"
                aria-label="Restaurar Autosave"
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

          <div className="h-6 w-px bg-zinc-800 mx-0.5 sm:mx-1 hidden sm:block" />

          {/* Mode selector */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
            <button
              onClick={() => engine.setProjectionMode('ortho')}
              className={`px-2 lg:px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                engine.projectionMode === 'ortho'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Modo 2D Clássico (Ortográfico)"
              aria-label="Modo 2D Clássico"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">2D Padrão</span>
            </button>

            <button
              onClick={() => engine.setProjectionMode('isometric')}
              className={`px-2 lg:px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                engine.projectionMode === 'isometric'
                  ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 shadow-sm'
                  : 'text-zinc-400 hover:text-cyan-300'
              }`}
              title="Modo Isométrico 2:1 (Trava 2:1 e Primitivas 3D)"
              aria-label="Modo Isométrico 2:1"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Isométrico 2:1</span>
            </button>

            <button
              onClick={() => engine.setProjectionMode('wrap')}
              className={`px-2 lg:px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                engine.projectionMode === 'wrap'
                  ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50 shadow-sm'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
              title="Modo Tileset Seamless (Repetição 3x3)"
              aria-label="Modo Tileset Wrap"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Tileset Wrap</span>
            </button>
          </div>
        </div>

        {/* Center Section: History & View Controls */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800 shrink-0">
          <button
            disabled={!engine.history.canUndo}
            onClick={() => engine.history.undo()}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
            title="Desfazer (Ctrl+Z)"
            aria-label="Desfazer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            disabled={!engine.history.canRedo}
            onClick={() => engine.history.redo()}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
            title="Refazer (Ctrl+Y)"
            aria-label="Refazer"
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
            aria-label="Alternar Grid de Pixels"
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
            aria-label="Alternar Grid Isométrico"
          >
            <Box className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={() => engine.viewport.setZoom(engine.viewport.zoom - 2)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
            title="Diminuir Zoom"
            aria-label="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-semibold px-1 text-zinc-300 min-w-10 text-center">
            {engine.viewport.zoom}x
          </span>
          <button
            onClick={() => engine.viewport.setZoom(engine.viewport.zoom + 2)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
            title="Aumentar Zoom"
            aria-label="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Right Section: Export & Tools Dropdown + Shortcuts + Mobile Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Unified Export & Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-medium text-xs px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
              title="Exportar ou Gerar Recursos"
              aria-label="Exportar ou Gerar Recursos"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 top-10 w-56 bg-zinc-900 border border-zinc-700/90 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image Exports */}
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Imagens & Animações
                </div>
                
                <div className="bg-zinc-950/60 rounded-lg p-1.5 border border-zinc-800/80 mb-1">
                  <div className="text-[10px] text-zinc-400 px-1 py-0.5 font-medium flex items-center justify-between">
                    <span>PNG Escala</span>
                    <span className="font-mono text-cyan-400 text-[10px]">Crisp</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[1, 2, 4, 8, 16].map((sc) => (
                      <button
                        key={sc}
                        onClick={() => handleExport(sc)}
                        className={`py-1 text-center font-mono rounded text-[11px] font-semibold transition-colors ${
                          sc === 4 
                            ? 'bg-cyan-600 text-white shadow-xs' 
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                        }`}
                        title={`Exportar PNG ${sc}x (${engine.document.width * sc}×${engine.document.height * sc}px)`}
                      >
                        {sc}x
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsGifModalOpen(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 font-medium flex items-center gap-2 transition-colors"
                >
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  <span>GIF Animado (.gif)</span>
                </button>

                {/* Divider */}
                <div className="h-px bg-zinc-800 my-0.5" />

                {/* Game & Web Resources */}
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Código Web & Games
                </div>

                <button
                  onClick={() => {
                    setIsCodeModalOpen(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-blue-300 hover:bg-blue-950/40 hover:text-blue-200 font-medium flex items-center gap-2 transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Código CSS & SVG</span>
                </button>

                <button
                  onClick={() => {
                    setIsSpritesheetModalOpen(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200 font-medium flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Spritesheet / Atlas JSON</span>
                </button>

                <button
                  onClick={() => {
                    setIsNormalMapModalOpen(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 font-medium flex items-center gap-2 transition-colors"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Luz 2.5D & Normal Map</span>
                </button>
              </div>
            )}
          </div>

          {/* Shortcuts Modal Trigger */}
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Atalhos de Teclado (?)"
            aria-label="Guia de Atalhos de Teclado"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Mobile Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg lg:hidden transition-colors"
              title="Abrir Camadas e Paleta"
              aria-label="Abrir Camadas e Paleta"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
            </button>
          )}
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

    <CodeExportModal
      isOpen={isCodeModalOpen}
      onClose={() => setIsCodeModalOpen(false)}
      engine={engine}
    />
  </>
);
};
