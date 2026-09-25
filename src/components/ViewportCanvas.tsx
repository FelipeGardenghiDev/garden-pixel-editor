import React, { useRef, useEffect, useCallback } from 'react';
import { EditorEngine } from '../core/editor-engine';

interface ViewportCanvasProps {
  engine: EditorEngine;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({ engine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Offscreen canvas for document compositing
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display pixel size
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // 1. Clear background
    ctx.fillStyle = '#18181b'; // zinc-900 dark workspace
    ctx.fillRect(0, 0, width, height);

    const docW = engine.document.width;
    const docH = engine.document.height;
    const zoom = engine.viewport.zoom;
    const panX = engine.viewport.panX;
    const panY = engine.viewport.panY;

    const docScreenW = docW * zoom;
    const docScreenH = docH * zoom;

    // 2. Offscreen rendering of document + preview
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenCanvasRef.current;
    if (offscreen.width !== docW || offscreen.height !== docH) {
      offscreen.width = docW;
      offscreen.height = docH;
    }

    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      const composite = engine.document.composite();

      // Overlay preview buffer (e.g. while dragging line or cube)
      const finalData = new Uint32Array(composite.data);
      for (let i = 0; i < finalData.length; i++) {
        const previewColor = engine.previewBuffer.data[i];
        if ((previewColor & 0xFF000000) !== 0) {
          finalData[i] = previewColor;
        }
      }

      const imgData = offCtx.createImageData(docW, docH);
      const uint32View = new Uint32Array(imgData.data.buffer);
      uint32View.set(finalData);
      offCtx.putImageData(imgData, 0, 0);
    }

    // Helper to draw checkerboard transparency
    const drawCheckerboard = (startX: number, startY: number, w: number, h: number, size: number = 8) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, startY, w, h);
      ctx.clip();
      for (let y = startY; y < startY + h; y += size) {
        for (let x = startX; x < startX + w; x += size) {
          const isEven = (Math.floor((x - startX) / size) + Math.floor((y - startY) / size)) % 2 === 0;
          ctx.fillStyle = isEven ? '#27272a' : '#202023';
          ctx.fillRect(x, y, size, size);
        }
      }
      ctx.restore();
    };

    // 3. If in Wrap Mode, draw seamless 3x3 repetition ghost tiles!
    if (engine.projectionMode === 'wrap') {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.imageSmoothingEnabled = false;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const ghostX = panX + ox * docScreenW;
          const ghostY = panY + oy * docScreenH;
          drawCheckerboard(ghostX, ghostY, docScreenW, docScreenH, Math.max(4, zoom / 2));
          ctx.drawImage(offscreen, ghostX, ghostY, docScreenW, docScreenH);
        }
      }
      ctx.restore();
    }

    // 4. Draw central canvas checkerboard
    drawCheckerboard(panX, panY, docScreenW, docScreenH, Math.max(4, zoom / 2));

    // 5. Draw crisp pixel document
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, panX, panY, docScreenW, docScreenH);

    // Canvas border shadow / outline
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.strokeRect(panX - 0.5, panY - 0.5, docScreenW + 1, docScreenH + 1);

    // 6. Draw Pixel Grid (when zoomed in)
    if (engine.showPixelGrid && zoom >= 8) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < docW; x++) {
        const sx = Math.floor(panX + x * zoom) + 0.5;
        ctx.moveTo(sx, panY);
        ctx.lineTo(sx, panY + docScreenH);
      }
      for (let y = 1; y < docH; y++) {
        const sy = Math.floor(panY + y * zoom) + 0.5;
        ctx.moveTo(panX, sy);
        ctx.lineTo(panX + docScreenW, sy);
      }
      ctx.stroke();
    }

    // 7. Draw Isometric 2:1 Grid
    if (engine.showIsoGrid && engine.projectionMode === 'isometric') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(panX, panY, docScreenW, docScreenH);
      ctx.clip(); // Keep iso lines strictly inside canvas area

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)'; // cyan-400 tint
      ctx.lineWidth = 1;
      ctx.beginPath();

      const step = engine.isoStepSize * zoom; // e.g. every 4 pixels

      // Slope +0.5 (Down-Right: deltaX = 2, deltaY = 1) -> y = 0.5x + c
      // In screen coords: sy = 0.5 * (sx - panX) + constant
      const maxDist = (docScreenW + docScreenH * 2);
      for (let offset = -maxDist; offset <= maxDist; offset += step) {
        // Line: (x, 0.5*x + offset)
        const x1 = panX;
        const y1 = panY + offset * 0.5;
        const x2 = panX + docScreenW;
        const y2 = panY + offset * 0.5 + docScreenW * 0.5;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }

      // Slope -0.5 (Down-Left: deltaX = -2, deltaY = 1) -> y = -0.5x + c
      for (let offset = -maxDist; offset <= maxDist; offset += step) {
        const x1 = panX;
        const y1 = panY + offset * 0.5;
        const x2 = panX + docScreenW;
        const y2 = panY + offset * 0.5 - docScreenW * 0.5;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }

      ctx.stroke();
      ctx.restore();
    }

    // 8. Draw Cursor Hover Indicator
    if (engine.currentHoverPixel) {
      const hx = engine.currentHoverPixel.x;
      const hy = engine.currentHoverPixel.y;
      if (hx >= 0 && hx < docW && hy >= 0 && hy < docH) {
        const sx = panX + hx * zoom;
        const sy = panY + hy * zoom;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx, sy, zoom, zoom);
      }
    }
  }, [engine]);

  // Subscribe to engine state changes
  useEffect(() => {
    const unsub = engine.onStateChange(() => {
      render();
    });
    render();
    return unsub;
  }, [engine, render]);

  // Center canvas on first load
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      engine.viewport.centerInView(
        container.clientWidth,
        container.clientHeight,
        engine.document.width,
        engine.document.height
      );
      render();
    }
  }, [engine, render]);

  // Event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    engine.handlePointerDown(e, rect);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    engine.handlePointerMove(e, rect);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    engine.handlePointerUp(e, rect);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    engine.handleWheel(e, rect);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-crosshair bg-zinc-950"
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
};
