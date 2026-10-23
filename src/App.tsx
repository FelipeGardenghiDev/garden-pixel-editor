import React, { useEffect, useState } from 'react';
import { EditorEngine } from './core/editor-engine';
import { TopBar } from './components/TopBar';
import { BrushSettingsBar } from './components/BrushSettingsBar';
import { ToolBar } from './components/ToolBar';
import { ViewportCanvas } from './components/ViewportCanvas';
import { Timeline } from './components/Timeline';
import { RightSidebar } from './components/RightSidebar';
import { StatusBar } from './components/StatusBar';
import { FloatingPreview } from './components/FloatingPreview';
import { ShortcutsModal } from './components/ShortcutsModal';
import { downloadProjectFile } from './core/project-file';
import { Undo2, Redo2, Maximize2 } from 'lucide-react';

export const App: React.FC = () => {
  // Stable reference to the EditorEngine instance via state initializer
  const [engine] = useState(() => new EditorEngine(48, 48));
  const [, setTick] = useState(0);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(false);

  // Re-render UI when engine state changes
  useEffect(() => {
    const unsub = engine.onStateChange(() => {
      setTick(t => t + 1);
    });
    return unsub;
  }, [engine]);

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        engine.isSpacePressed = true;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        downloadProjectFile(engine);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.history.redo();
        } else {
          engine.history.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        engine.history.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        engine.selectAll();
      } else if (e.key === 'Escape') {
        engine.clearSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        engine.deleteSelection();
      } else if (e.key === '[') {
        engine.shadeActiveColor('darker');
      } else if (e.key === ']') {
        engine.shadeActiveColor('lighter');
      } else if (e.key === ',') {
        engine.prevFrame();
      } else if (e.key === '.') {
        engine.nextFrame();
      } else if (e.key.toLowerCase() === 'x') {
        engine.swapColors();
      } else if (e.key.toLowerCase() === 'b') {
        engine.setTool('pencil');
      } else if (e.key.toLowerCase() === 'd') {
        engine.setTool('dither');
      } else if (e.key.toLowerCase() === 'e') {
        engine.setTool('eraser');
      } else if (e.key.toLowerCase() === 'm') {
        engine.setTool('select');
      } else if (e.key.toLowerCase() === 'l') {
        engine.setTool('line');
      } else if (e.key.toLowerCase() === 'r') {
        engine.setTool('rectangle');
      } else if (e.key.toLowerCase() === 'o') {
        engine.setTool('circle');
      } else if (e.key.toLowerCase() === 'c') {
        engine.setTool('isocube');
      } else if (e.key.toLowerCase() === 'y') {
        engine.setTool('isocylinder');
      } else if (e.key.toLowerCase() === 'p') {
        engine.setTool('isoramp');
      } else if (e.key.toLowerCase() === 'g') {
        engine.setTool('bucket');
      } else if (e.key.toLowerCase() === 'i') {
        engine.setTool('picker');
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        engine.isSpacePressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <TopBar 
        engine={engine} 
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
      />
      <BrushSettingsBar engine={engine} />

      <div className="flex flex-1 overflow-hidden relative">
        <ToolBar 
          engine={engine} 
          onOpenPalette={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <ViewportCanvas engine={engine} />
            <FloatingPreview engine={engine} />

            {/* Floating Mobile Canvas Quick Action Bar */}
            <div className="sm:hidden absolute top-3 right-3 z-30 flex items-center gap-1 bg-zinc-900/95 border border-zinc-700/80 p-1 rounded-2xl shadow-2xl backdrop-blur-md">
              <button
                disabled={!engine.history.canUndo}
                onClick={() => engine.history.undo()}
                className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 disabled:opacity-25 rounded-xl transition-all"
                title="Desfazer"
                aria-label="Desfazer"
              >
                <Undo2 className="w-4 h-4 text-cyan-400 disabled:text-zinc-600" />
              </button>
              <button
                disabled={!engine.history.canRedo}
                onClick={() => engine.history.redo()}
                className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white active:bg-zinc-800 disabled:opacity-25 rounded-xl transition-all"
                title="Refazer"
                aria-label="Refazer"
              >
                <Redo2 className="w-4 h-4 text-cyan-400 disabled:text-zinc-600" />
              </button>
              <div className="w-px h-5 bg-zinc-800 mx-0.5" />
              <button
                onClick={() => {
                  engine.viewport.centerInView(
                    window.innerWidth,
                    window.innerHeight,
                    engine.document.width,
                    engine.document.height
                  );
                }}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-cyan-300 active:bg-zinc-800 rounded-xl transition-all"
                title="Centralizar e Enquadrar Canvas"
                aria-label="Centralizar Canvas"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <Timeline engine={engine} />
        </main>
        <RightSidebar 
          engine={engine}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsedDesktop={isDesktopSidebarCollapsed}
          onToggleCollapseDesktop={() => setIsDesktopSidebarCollapsed(prev => !prev)}
        />
      </div>

      <StatusBar engine={engine} />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

export default App;
