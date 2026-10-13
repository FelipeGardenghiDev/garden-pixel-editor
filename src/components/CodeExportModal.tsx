import React, { useState, useMemo } from 'react';
import { X, Code2, Copy, Check, Download, FileCode2 } from 'lucide-react';
import { EditorEngine } from '../core/editor-engine';
import { generateCssBoxShadow, generateSvg, downloadTextFile } from '../core/code-export';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: EditorEngine;
}

type ExportMode = 'css' | 'svg';

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose, engine }) => {
  const [mode, setMode] = useState<ExportMode>('css');
  const [pixelSize, setPixelSize] = useState<number>(4);
  const [copied, setCopied] = useState<boolean>(false);

  const composite = useMemo(() => {
    if (!isOpen) return null;
    return engine.document.composite();
  }, [isOpen, engine.document]);

  const generatedCode = useMemo(() => {
    if (!composite) return '';
    if (mode === 'css') {
      return generateCssBoxShadow(composite, pixelSize);
    }
    return generateSvg(composite, pixelSize);
  }, [composite, mode, pixelSize]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = generatedCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const filename = `pixel-art-${engine.projectionMode}.${mode === 'css' ? 'css' : 'svg'}`;
    const mime = mode === 'css' ? 'text/css' : 'image/svg+xml';
    downloadTextFile(filename, generatedCode, mime);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                Exportar para Código Web
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono font-semibold">
                  CSS & SVG
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Gere CSS box-shadow para uma única tag HTML ou vetor SVG para web e jogos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Controls */}
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between gap-4">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setMode('css')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                mode === 'css'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              CSS box-shadow
            </button>
            <button
              onClick={() => setMode('svg')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                mode === 'svg'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              SVG Vetorial
            </button>
          </div>

          {/* Pixel Size / Scale Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">Tamanho do Pixel:</span>
            <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              {[2, 4, 8, 12, 16].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setPixelSize(sz)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-colors ${
                    pixelSize === sz
                      ? 'bg-zinc-800 text-cyan-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Code Viewport */}
        <div className="p-4 flex-1 overflow-auto bg-zinc-950/80 font-mono text-[11px] text-zinc-300">
          <pre className="whitespace-pre overflow-x-auto selection:bg-cyan-900 selection:text-cyan-100">
            {generatedCode}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
          <div className="text-zinc-400">
            {mode === 'css' ? (
              <span>💡 Dica: Crie uma tag <code className="text-cyan-400">&lt;div class="pixel-art"&gt;&lt;/div&gt;</code> para renderizar.</span>
            ) : (
              <span>💡 SVG com atributo <code className="text-cyan-400">shape-rendering="crispEdges"</code> para nitidez absoluta.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar Código'}
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              Baixar {mode === 'css' ? '.css' : '.svg'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
