import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';

interface FloatingPreviewProps {
  engine: EditorEngine;
}

export const FloatingPreview: React.FC<FloatingPreviewProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState<1 | 2 | 4>(1); // 1x true scale, 2x or 4x preview
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewFrameIdx, setPreviewFrameIdx] = useState<number>(0);
  const [, setTick] = useState<number>(0);

  // Re-render in real-time on any drawing stroke or engine event
  useEffect(() => {
    const unsubDoc = engine.document.onChange(() => setTick((t) => t + 1));
    const unsubEngine = engine.onStateChange(() => setTick((t) => t + 1));
    return () => {
      unsubDoc();
      unsubEngine();
    };
  }, [engine]);

  const doc = engine.document;
  const docW = doc.width;
  const docH = doc.height;
  const frameCount = doc.frames.length;

  // Animation playback in preview
  useEffect(() => {
    if (!isPlayingPreview || frameCount <= 1) return;

    const interval = 1000 / (engine.fps || 8);
    const timer = setInterval(() => {
      setPreviewFrameIdx((prev) => (prev + 1) % frameCount);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlayingPreview, frameCount, engine.fps]);


  // Render pixels onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible || isCollapsed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = docW * scale;
    const targetH = docH * scale;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // 1. Draw Checkerboard background
    const chkSize = 4 * scale;
    for (let y = 0; y < targetH; y += chkSize) {
      for (let x = 0; x < targetW; x += chkSize) {
        const isEven = (Math.floor(x / chkSize) + Math.floor(y / chkSize)) % 2 === 0;
        ctx.fillStyle = isEven ? '#27272a' : '#18181b';
        ctx.fillRect(x, y, chkSize, chkSize);
      }
    }

    // 2. Composite frame
    const currentFrame = isPlayingPreview ? previewFrameIdx : engine.document.activeFrameIndex;
    const composite = doc.composite(undefined, currentFrame);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = docW;
    tempCanvas.height = docH;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      const imgData = tempCtx.createImageData(docW, docH);
      new Uint32Array(imgData.data.buffer).set(composite.data);
      tempCtx.putImageData(imgData, 0, 0);

      // Draw scaled with nearest-neighbor crispness
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, targetW, targetH);
    }
  }, [doc, docW, docH, scale, previewFrameIdx, isPlayingPreview, engine.document.activeFrameIndex, isVisible, isCollapsed]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="absolute bottom-4 right-4 z-30 px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 border border-zinc-700/80 rounded-xl shadow-xl backdrop-blur-md text-xs flex items-center gap-1.5 transition-all"
        title="Mostrar Prévia 1:1"
        aria-label="Mostrar Prévia 1:1"
      >
        <Eye className="w-4 h-4 text-cyan-400" />
        <span className="font-mono font-medium">1:1</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-30 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden select-none transition-all">
      {/* Header bar */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950/60">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
            Prévia
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {docW}×{docH}px
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* 1x / 2x / 4x scale buttons */}
          <div className="flex items-center bg-zinc-800 rounded p-0.5 border border-zinc-700/60">
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  scale === s
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={`Escala ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Animation Play/Pause if multi-frame */}
          {frameCount > 1 && (
            <button
              onClick={() => {
                if (!isPlayingPreview) {
                  setPreviewFrameIdx(engine.document.activeFrameIndex);
                }
                setIsPlayingPreview(!isPlayingPreview);
              }}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
              title={isPlayingPreview ? 'Pausar prévia' : 'Animar prévia'}
            >
              {isPlayingPreview ? (
                <Pause className="w-3 h-3 text-amber-400" />
              ) : (
                <Play className="w-3 h-3 fill-current ml-0.5 text-zinc-400" />
              )}
            </button>
          )}

          {/* Minimize / Maximize */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>

          {/* Close/Hide */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
            title="Ocultar Prévia"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      {!isCollapsed && (
        <div className="p-3 flex items-center justify-center bg-zinc-950/80 min-w-32 min-h-32 max-w-72 max-h-72 overflow-auto">
          <canvas
            ref={canvasRef}
            width={docW * scale}
            height={docH * scale}
            className="rounded-lg shadow-md border border-zinc-800 shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}
    </div>
  );
};
