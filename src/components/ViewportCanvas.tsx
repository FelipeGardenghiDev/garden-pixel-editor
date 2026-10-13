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

      // Overlay floating selection buffer if active
      if (engine.floatingSelection) {
        const fs = engine.floatingSelection;
        for (let r = 0; r < fs.rect.height; r++) {
          const curY = fs.rect.y + r;
          if (curY < 0 || curY >= docH) continue;
          for (let c = 0; c < fs.rect.width; c++) {
            const curX = fs.rect.x + c;
            if (curX < 0 || curX >= docW) continue;
            const col = fs.buffer.getPixel(c, r);
            if ((col & 0xFF000000) !== 0) {
              finalData[curY * docW + curX] = col;
            }
          }
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

    // 4.5. Draw Onion Skinning Ghosts (if enabled)
    if (engine.onionSkinning && engine.document.frames.length > 1) {
      const prevIdx = (engine.document.activeFrameIndex - 1 + engine.document.frames.length) % engine.document.frames.length;
      const prevComposite = engine.document.composite(undefined, prevIdx);
      const prevCanvas = document.createElement('canvas');
      prevCanvas.width = docW;
      prevCanvas.height = docH;
      const prevCtx = prevCanvas.getContext('2d');
      if (prevCtx) {
        const imgData = prevCtx.createImageData(docW, docH);
        new Uint32Array(imgData.data.buffer).set(prevComposite.data);
        prevCtx.putImageData(imgData, 0, 0);

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(prevCanvas, panX, panY, docScreenW, docScreenH);
        ctx.restore();
      }

      const nextIdx = (engine.document.activeFrameIndex + 1) % engine.document.frames.length;
      const nextComposite = engine.document.composite(undefined, nextIdx);
      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = docW;
      nextCanvas.height = docH;
      const nextCtx = nextCanvas.getContext('2d');
      if (nextCtx) {
        const imgData = nextCtx.createImageData(docW, docH);
        new Uint32Array(imgData.data.buffer).set(nextComposite.data);
        nextCtx.putImageData(imgData, 0, 0);

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(nextCanvas, panX, panY, docScreenW, docScreenH);
        ctx.restore();
      }
    }

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

    // 8. Draw Selection Marquee (Marching Ants / Dashed Box)
    if (engine.selectionRect) {
      const { x, y, width, height } = engine.selectionRect;
      const sx = panX + x * zoom;
      const sy = panY + y * zoom;
      const sw = width * zoom;
      const sh = height * zoom;

      ctx.save();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sx - 0.5, sy - 0.5, sw + 1, sh + 1);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = (Date.now() / 60) % 8;
      ctx.strokeRect(sx - 0.5, sy - 0.5, sw + 1, sh + 1);
      ctx.restore();
    }

    // 8.5. Draw Symmetry Guidelines
    if (engine.symmetryX) {
      const symSx = panX + (docW / 2) * zoom;
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(symSx, panY);
      ctx.lineTo(symSx, panY + docScreenH);
      ctx.stroke();
      ctx.restore();
    }

    if (engine.symmetryY) {
      const symSy = panY + (docH / 2) * zoom;
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(panX, symSy);
      ctx.lineTo(panX + docScreenW, symSy);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Draw Cursor Hover Indicator (with brush size & symmetry support)
    if (engine.currentHoverPixel) {
      const hx = engine.currentHoverPixel.x;
      const hy = engine.currentHoverPixel.y;
      const size = (engine.currentTool === 'pencil' || engine.currentTool === 'eraser' || engine.currentTool === 'dither')
        ? engine.brushSize
        : 1;

      const drawCursorBox = (cx: number, cy: number, isMirror: boolean = false) => {
        if (cx >= 0 && cx < docW && cy >= 0 && cy < docH) {
          const sx = panX + cx * zoom;
          const sy = panY + cy * zoom;
          ctx.strokeStyle = isMirror ? '#fb7185' : '#ffffff';
          ctx.lineWidth = 1.5;
          if (isMirror) {
            ctx.setLineDash([2, 2]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.strokeRect(sx, sy, zoom * size, zoom * size);
        }
      };

      // Primary cursor
      drawCursorBox(hx, hy, false);

      // Mirrored cursors
      if (engine.symmetryX) {
        drawCursorBox(docW - size - hx, hy, true);
      }
      if (engine.symmetryY) {
        drawCursorBox(hx, docH - size - hy, true);
      }
      if (engine.symmetryX && engine.symmetryY) {
        drawCursorBox(docW - size - hx, docH - size - hy, true);
      }
    }
  }, [engine]);

  // Subscribe to engine state changes & animate marching ants
  useEffect(() => {
    let animId: number;
    const unsub = engine.onStateChange(() => {
      render();
    });

    const loop = () => {
      if (engine.selectionRect) {
        render();
        animId = requestAnimationFrame(loop);
      }
    };

    if (engine.selectionRect) {
      animId = requestAnimationFrame(loop);
    } else {
      render();
    }

    return () => {
      unsub();
      cancelAnimationFrame(animId);
    };
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

  // Multi-touch tracking for pinch-to-zoom, two-finger pan and multi-finger tap gestures (Undo/Redo)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(engine.viewport.zoom);
  const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Quick multi-touch tap tracker for Undo (2-finger tap) and Redo (3-finger tap)
  const tapGestureRef = useRef<{
    startTime: number;
    maxPointers: number;
    startPositions: Map<number, { x: number; y: number }>;
    hasMoved: boolean;
  }>({
    startTime: 0,
    maxPointers: 0,
    startPositions: new Map(),
    hasMoved: false,
  });

  // Event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const count = activePointersRef.current.size;

    if (count === 1) {
      tapGestureRef.current = {
        startTime: Date.now(),
        maxPointers: 1,
        startPositions: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
        hasMoved: false,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      engine.handlePointerDown(e, rect);
    } else {
      tapGestureRef.current.maxPointers = Math.max(tapGestureRef.current.maxPointers, count);
      tapGestureRef.current.startPositions.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Multiple fingers down: cancel single-touch drawing
      engine.cancelDrawing();

      if (count === 2) {
        const pts = Array.from(activePointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        initialPinchDistRef.current = dist;
        initialPinchZoomRef.current = engine.viewport.zoom;
        lastPinchCenterRef.current = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Track movement distance to distinguish tap vs pan/pinch
      const startPos = tapGestureRef.current.startPositions.get(e.pointerId);
      if (startPos) {
        const dist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);
        if (dist > 14) {
          tapGestureRef.current.hasMoved = true;
        }
      }
    }

    // Two-finger multi-touch gesture (Pinch Zoom & Two-Finger Pan)
    if (
      activePointersRef.current.size === 2 &&
      initialPinchDistRef.current !== null &&
      lastPinchCenterRef.current !== null
    ) {
      const pts = Array.from(activePointersRef.current.values());
      const curDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const curCenter = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      // 1. Two-finger Pan
      const dx = curCenter.x - lastPinchCenterRef.current.x;
      const dy = curCenter.y - lastPinchCenterRef.current.y;
      engine.viewport.panBy(dx, dy);
      lastPinchCenterRef.current = curCenter;

      // 2. Pinch Zoom
      if (initialPinchDistRef.current > 0) {
        const ratio = curDist / initialPinchDistRef.current;
        const targetZoom = Math.max(1, Math.min(64, Math.round(initialPinchZoomRef.current * ratio)));
        engine.viewport.setZoom(targetZoom);
      }
      return;
    }

    if (activePointersRef.current.size <= 1) {
      engine.handlePointerMove(e, rect);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
      lastPinchCenterRef.current = null;
    }

    if (activePointersRef.current.size === 0) {
      const elapsed = Date.now() - tapGestureRef.current.startTime;
      const { maxPointers, hasMoved } = tapGestureRef.current;

      // Procreate-style multi-finger tap gestures:
      // 2-finger stationary tap = Undo
      // 3-finger stationary tap = Redo
      if (elapsed < 350 && !hasMoved) {
        if (maxPointers === 2) {
          engine.history.undo();
          return;
        } else if (maxPointers === 3) {
          engine.history.redo();
          return;
        }
      }

      if (rect) {
        engine.handlePointerUp(e, rect);
      }
    }
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
        className="absolute inset-0 block touch-none focus:outline-none"
        tabIndex={0}
        aria-label="Canvas de Pixel Art"
        role="region"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};
