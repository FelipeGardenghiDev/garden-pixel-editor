import React, { useEffect, useState } from 'react';
import { EditorEngine } from './core/editor-engine';
import { TopBar } from './components/TopBar';
import { ToolBar } from './components/ToolBar';
import { ViewportCanvas } from './components/ViewportCanvas';
import { RightSidebar } from './components/RightSidebar';
import { StatusBar } from './components/StatusBar';

export const App: React.FC = () => {
  // Stable reference to the EditorEngine instance via state initializer
  const [engine] = useState(() => new EditorEngine(48, 48));
  const [, setTick] = useState(0);

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
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.code === 'Space') {
        engine.isSpacePressed = true;
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
      } else if (e.key.toLowerCase() === 'b') {
        engine.setTool('pencil');
      } else if (e.key.toLowerCase() === 'e') {
        engine.setTool('eraser');
      } else if (e.key.toLowerCase() === 'l') {
        engine.setTool('line');
      } else if (e.key.toLowerCase() === 'r') {
        engine.setTool('rectangle');
      } else if (e.key.toLowerCase() === 'c') {
        engine.setTool('isocube');
      } else if (e.key.toLowerCase() === 'g') {
        engine.setTool('bucket');
      } else if (e.key.toLowerCase() === 'i') {
        engine.setTool('picker');
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <TopBar engine={engine} />

      <div className="flex flex-1 overflow-hidden relative">
        <ToolBar engine={engine} />
        <main className="flex-1 relative overflow-hidden">
          <ViewportCanvas engine={engine} />
        </main>
        <RightSidebar engine={engine} />
      </div>

      <StatusBar engine={engine} />
    </div>
  );
};

export default App;
