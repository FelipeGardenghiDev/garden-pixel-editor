import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sun, Download, Sliders, Layers, Sparkles, Compass } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { generateNormalMap, renderLitPreview, exportNormalMapToPng } from '../core/normal-map';
import type { PixelBuffer } from '../core/pixel-buffer';

interface NormalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

export const NormalMapModal: React.FC<NormalMapModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Settings
  const [viewMode, setViewMode] = useState<'lit' | 'normal' | 'diffuse'>('lit');
  const [strength, setStrength] = useState<number>(2.5);
  const [bevelRadius, setBevelRadius] = useState<number>(2);
  const [invertY, setInvertY] = useState<boolean>(false);
  const [isoTilted, setIsoTilted] = useState<boolean>(engine.projectionMode === 'isometric');

  // Lighting parameters
  const [lightZ, setLightZ] = useState<number>(28);
  const [lightColor, setLightColor] = useState<string>('#FFFFFF');
  const [lightIntensity, setLightIntensity] = useState<number>(1.3);
  const [ambientIntensity, setAmbientIntensity] = useState<number>(0.35);
  const [exportScale, setExportScale] = useState<number>(4);

  // Mouse light position (relative to canvas pixels)
  const [lightPos, setLightPos] = useState<{ x: number; y: number }>({
    x: Math.round(engine.document.width / 2),
    y: Math.round(engine.document.height / 3)
  });

  const normalBufferRef = useRef<PixelBuffer | null>(null);

  // Update normal map when generation settings change
  useEffect(() => {
    if (!isOpen) return;
    const diffuse = engine.document.composite();
    normalBufferRef.current = generateNormalMap(diffuse, {
      strength,
      bevelRadius,
      invertY,
      isoTilted
    });
  }, [isOpen, engine, strength, bevelRadius, invertY, isoTilted]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = engine.document.width;
    const h = engine.document.height;

    const displayScale = Math.min(
      Math.floor(400 / Math.max(w, h)),
      16
    ) || 8;

    canvas.width = w * displayScale;
    canvas.height = h * displayScale;

    const diffuse = engine.document.composite();
    const normal = normalBufferRef.current || generateNormalMap(diffuse, { strength, bevelRadius, invertY, isoTilted });

    let activeBuffer: PixelBuffer;
    if (viewMode === 'normal') {
      activeBuffer = normal;
    } else if (viewMode === 'diffuse') {
      activeBuffer = diffuse;
    } else {
      activeBuffer = renderLitPreview(
        diffuse,
        normal,
        lightPos.x,
        lightPos.y,
        lightZ,
        {
          lightColor,
          lightIntensity,
          ambientColor: '#27272A',
          ambientIntensity,
          specularShininess: 18,
          specularIntensity: 0.5
        }
      );
    }

    // Checkerboard background
    const bgPatternSize = 12;
    for (let py = 0; py < canvas.height; py += bgPatternSize) {
      for (let px = 0; px < canvas.width; px += bgPatternSize) {
        const even = (Math.floor(px / bgPatternSize) + Math.floor(py / bgPatternSize)) % 2 === 0;
        ctx.fillStyle = even ? '#1c1c20' : '#141416';
        ctx.fillRect(px, py, bgPatternSize, bgPatternSize);
      }
    }

    // Put pixels crisp
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const imgData = tempCtx.createImageData(w, h);
      const uintView = new Uint32Array(imgData.data.buffer);
      uintView.set(activeBuffer.data);
      tempCtx.putImageData(imgData, 0, 0);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }

    // If in Lit mode, draw a small light gizmo
    if (viewMode === 'lit') {
      const lx = lightPos.x * displayScale;
      const ly = lightPos.y * displayScale;
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fillStyle = lightColor;
      ctx.shadowColor = lightColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [
    isOpen, engine, viewMode, strength, bevelRadius, invertY, isoTilted,
    lightPos, lightZ, lightColor, lightIntensity, ambientIntensity
  ]);

  useEffect(() => {
    render();
  }, [render]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'lit') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = engine.document.width / rect.width;
    const scaleY = engine.document.height / rect.height;

    const x = Math.max(0, Math.min(engine.document.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(engine.document.height - 1, Math.round((e.clientY - rect.top) * scaleY)));

    setLightPos({ x, y });
  };

  const handleExport = () => {
    const diffuse = engine.document.composite();
    const normal = normalBufferRef.current || generateNormalMap(diffuse, { strength, bevelRadius, invertY, isoTilted });
    exportNormalMapToPng(normal, exportScale, `garden_normal_map_${exportScale}x.png`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                Normal Map & Iluminação 2.5D
                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded font-mono">
                  GODOT / UNITY
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left: Interactive Canvas */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-zinc-950 relative border-b md:border-b-0 md:border-r border-zinc-800">
            {/* View Mode Bar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 shadow-lg backdrop-blur-xs">
              <button
                onClick={() => setViewMode('lit')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === 'lit' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Luz 2.5D
              </button>
              <button
                onClick={() => setViewMode('normal')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === 'normal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Normal Map
              </button>
              <button
                onClick={() => setViewMode('diffuse')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === 'diffuse' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Original
              </button>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerMove}
              onPointerMove={handlePointerMove}
              className="rounded-xl border border-zinc-800 shadow-2xl cursor-crosshair touch-none max-w-full max-h-[420px] object-contain"
            />

            {viewMode === 'lit' && (
              <span className="text-[11px] text-zinc-500 mt-3 font-mono">
                💡 Clique ou arraste o cursor sobre o canvas para mover o foco de luz 3D
              </span>
            )}
          </div>

          {/* Right: Controls & Parameters */}
          <div className="w-full md:w-80 p-5 overflow-y-auto flex flex-col gap-4 bg-zinc-900/70">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Parâmetros do Relevo
            </div>

            {/* Strength */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Intensidade do Relevo:</span>
                <span className="font-mono text-cyan-400 font-semibold">{strength.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Bevel Radius */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Borda Curvada (Bevel):</span>
                <span className="font-mono text-cyan-400 font-semibold">{bevelRadius}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={bevelRadius}
                onChange={(e) => setBevelRadius(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800 text-xs text-zinc-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isoTilted}
                  onChange={(e) => setIsoTilted(e.target.checked)}
                  className="rounded border-zinc-700 accent-cyan-500"
                />
                <span>Inclinação Isométrica (~30°)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invertY}
                  onChange={(e) => setInvertY(e.target.checked)}
                  className="rounded border-zinc-700 accent-cyan-500"
                />
                <span>Inverter Y (DirectX / Unreal)</span>
              </label>
            </div>

            {/* Light Controls */}
            <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Sun className="w-3.5 h-3.5" />
                Propriedades da Luz
              </div>

              {/* Quick light presets */}
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Sol', color: '#FFF8E7' },
                  { label: 'Tocha', color: '#FF9933' },
                  { label: 'Lua', color: '#6699FF' },
                  { label: 'Neon', color: '#00F0FF' }
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => setLightColor(p.color)}
                    className="px-2 py-0.5 rounded text-[10px] border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
                    style={{ borderLeftColor: p.color, borderLeftWidth: 3 }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300">Cor da Luz:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lightColor}
                    onChange={(e) => setLightColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-400">{lightColor}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Altura da Luz (Z):</span>
                  <span className="font-mono text-amber-400 font-semibold">{lightZ}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="64"
                  step="2"
                  value={lightZ}
                  onChange={(e) => setLightZ(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Intensidade da Luz:</span>
                  <span className="font-mono text-amber-400 font-semibold">{lightIntensity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={lightIntensity}
                  onChange={(e) => setLightIntensity(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Luz Ambiente:</span>
                  <span className="font-mono text-zinc-400 font-semibold">{ambientIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={ambientIntensity}
                  onChange={(e) => setAmbientIntensity(Number(e.target.value))}
                  className="w-full accent-zinc-500"
                />
              </div>
            </div>

            {/* Export Section */}
            <div className="mt-auto pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>Escala PNG:</span>
                <select
                  value={exportScale}
                  onChange={(e) => setExportScale(Number(e.target.value))}
                  className="bg-zinc-950 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-200 outline-none"
                >
                  <option value={1}>1x ({engine.document.width}px)</option>
                  <option value={2}>2x ({engine.document.width * 2}px)</option>
                  <option value={4}>4x ({engine.document.width * 4}px - Ideal)</option>
                  <option value={8}>8x ({engine.document.width * 8}px)</option>
                </select>
              </div>

              <button
                onClick={handleExport}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-amber-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Normal Map PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
