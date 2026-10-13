import React, { useState } from 'react';
import { X, Upload, Palette as PaletteIcon, Image as ImageIcon, Download, Check } from 'lucide-react';
import type { Palette } from '../core/types';
import { parseHexPalette, parseGplPalette, extractPaletteFromImage, exportPaletteToHex, exportPaletteToGpl } from '../core/palette-importer';

interface PaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPalette: Palette;
  onPaletteImported: (palette: Palette) => void;
}

export const PaletteModal: React.FC<PaletteModalProps> = ({
  isOpen,
  onClose,
  currentPalette,
  onPaletteImported
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'image' | 'export'>('file');
  const [fileError, setFileError] = useState<string | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<Palette | null>(null);
  const [maxColors, setMaxColors] = useState<number>(32);
  const [paletteName, setPaletteName] = useState<string>('Minha Paleta');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let pal: Palette;
        if (file.name.toLowerCase().endsWith('.gpl')) {
          pal = parseGplPalette(text, file.name.replace(/\.[^/.]+$/, ''));
        } else {
          pal = parseHexPalette(text, file.name.replace(/\.[^/.]+$/, ''));
        }
        setExtractedPalette(pal);
        setPaletteName(pal.name);
      } catch (err: unknown) {
        setFileError((err as Error).message || 'Erro ao processar arquivo.');
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const pal = await extractPaletteFromImage(file, maxColors);
      setExtractedPalette(pal);
      setPaletteName(pal.name);
    } catch (err: unknown) {
      setFileError((err as Error).message || 'Erro ao extrair cores da imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!extractedPalette) return;
    const finalPalette: Palette = {
      ...extractedPalette,
      name: paletteName.trim() || extractedPalette.name
    };
    onPaletteImported(finalPalette);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <PaletteIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-sm text-zinc-100">Gerenciador de Paletas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => { setActiveTab('file'); setExtractedPalette(null); setFileError(null); }}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'bg-zinc-900 text-cyan-400 border-t border-x border-zinc-800'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Arquivo (.hex / .gpl)
          </button>
          <button
            onClick={() => { setActiveTab('image'); setExtractedPalette(null); setFileError(null); }}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'image'
                ? 'bg-zinc-900 text-cyan-400 border-t border-x border-zinc-800'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Extrair de Imagem
          </button>
          <button
            onClick={() => { setActiveTab('export'); setExtractedPalette(null); setFileError(null); }}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-zinc-900 text-cyan-400 border-t border-x border-zinc-800'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Atual
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 max-h-[70vh] overflow-y-auto flex flex-col gap-4">
          {fileError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs">
              {fileError}
            </div>
          )}

          {activeTab === 'file' && (
            <div className="flex flex-col gap-3">
              <label className="border-2 border-dashed border-zinc-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-950/50">
                <Upload className="w-8 h-8 text-zinc-400" />
                <span className="text-xs text-zinc-200 font-medium text-center">
                  Clique ou arraste um arquivo <strong className="text-cyan-400">.hex</strong> (Lospec) ou <strong className="text-cyan-400">.gpl</strong> (GIMP / Aseprite)
                </span>
                <span className="text-[11px] text-zinc-500">Arquivos de texto com códigos hex ou RGB</span>
                <input
                  type="file"
                  accept=".hex,.gpl,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>Máximo de cores a extrair:</span>
                <span className="font-mono font-semibold text-cyan-400">{maxColors}</span>
              </div>
              <input
                type="range"
                min="4"
                max="64"
                step="4"
                value={maxColors}
                onChange={(e) => setMaxColors(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />

              <label className="border-2 border-dashed border-zinc-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-950/50">
                <ImageIcon className="w-8 h-8 text-zinc-400" />
                <span className="text-xs text-zinc-200 font-medium text-center">
                  Selecione uma imagem <strong className="text-cyan-400">PNG, JPG ou WebP</strong>
                </span>
                <span className="text-[11px] text-zinc-500">
                  {isProcessing ? 'Processando pixels...' : 'Extrai automaticamente a paleta mais frequente'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-zinc-300">
                Exportar a paleta ativa no momento: <strong className="text-white font-semibold">{currentPalette.name}</strong> ({currentPalette.colors.length} cores)
              </div>

              {/* Swatches preview */}
              <div className="grid grid-cols-8 gap-1.5 p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                {currentPalette.colors.map((hex, i) => (
                  <div
                    key={`${hex}-${i}`}
                    style={{ backgroundColor: hex }}
                    className="w-6 h-6 rounded-sm border border-black/20"
                    title={hex}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => exportPaletteToHex(currentPalette)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar .HEX (Lospec)
                </button>
                <button
                  onClick={() => exportPaletteToGpl(currentPalette)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar .GPL (GIMP/Aseprite)
                </button>
              </div>
            </div>
          )}

          {/* Extracted Swatches Preview & Import Confirmation */}
          {extractedPalette && (
            <div className="flex flex-col gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  {extractedPalette.colors.length} cores encontradas:
                </span>
                <input
                  type="text"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value)}
                  placeholder="Nome da paleta"
                  className="bg-zinc-900 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-200 outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1">
                {extractedPalette.colors.map((hex, i) => (
                  <div
                    key={`${hex}-${i}`}
                    style={{ backgroundColor: hex }}
                    className="w-6 h-6 rounded-sm border border-black/20"
                    title={hex}
                  />
                ))}
              </div>

              <button
                onClick={handleConfirmImport}
                className="w-full mt-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                Aplicar e Salvar Paleta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
