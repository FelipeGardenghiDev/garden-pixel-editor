import React from 'react';
import { X, Keyboard, HelpCircle } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Ferramentas de Desenho',
    items: [
      { keys: ['B'], description: 'Lápis / Pincel clássico ou pixel-perfect' },
      { keys: ['E'], description: 'Borracha' },
      { keys: ['L'], description: 'Linha reta (com trava 2:1 no modo Isométrico)' },
      { keys: ['R'], description: 'Retângulo / Caixa 2D' },
      { keys: ['O'], description: 'Círculo / Elipse (com proporção isométrica no modo Iso)' },
      { keys: ['D'], description: 'Pincel Dithering (Padrões Checker, Sparse, Bayer)' },
      { keys: ['G'], description: 'Balde de Tinta (Preenchimento Flood Fill)' },
      { keys: ['I'], description: 'Conta-gotas (Capturar cor sob o cursor)' },
      { keys: ['X'], description: 'Alternar entre cor Primária e Secundária' },
      { keys: ['Botão Dir.'], description: 'Pintar / desenhar com cor secundária' },
      { keys: ['['], description: 'Degrau de sombra mais escuro da paleta' },
      { keys: [']'], description: 'Degrau de sombra mais claro da paleta' },
    ],
  },
  {
    title: 'Primitivas Volumétricas 3D (Modo Iso)',
    items: [
      { keys: ['C'], description: 'Bloco 3D Isométrico (Cubo com iluminação dinâmica)' },
      { keys: ['Y'], description: 'Cilindro 3D Isométrico (Topo elíptico + altura)' },
      { keys: ['P'], description: 'Rampa / Telhado 3D Isométrico (Declive 2:1)' },
    ],
  },
  {
    title: 'Câmera, Viewport, Gestos Touch & Seleção',
    items: [
      { keys: ['Espaço', 'Arrastar'], description: 'Mover a Câmera (Pan suave)' },
      { keys: ['Scroll'], description: 'Zoom centrado no ponteiro do mouse' },
      { keys: ['2 Dedos (Arrastar)'], description: 'Pan e Zoom com pinça (Tablets / Celulares)' },
      { keys: ['2 Dedos (Toque)'], description: 'Desfazer traço (Undo em tablets/mobile)' },
      { keys: ['3 Dedos (Toque)'], description: 'Refazer traço (Redo em tablets/mobile)' },
      { keys: ['M'], description: 'Seleção Marquee retangular' },
      { keys: ['Ctrl', 'A'], description: 'Selecionar todo o canvas' },
      { keys: ['Esc'], description: 'Desmarcar seleção ativa' },
      { keys: ['Del'], description: 'Excluir pixels da seleção' },
    ],
  },
  {
    title: 'Histórico, Animação & Projeto',
    items: [
      { keys: ['Ctrl', 'Z'], description: 'Desfazer traço (Undo com Dirty Rects)' },
      { keys: ['Ctrl', 'Y'], description: 'Refazer traço (Redo)' },
      { keys: [','], description: 'Frame anterior na Linha do Tempo' },
      { keys: ['.'], description: 'Próximo frame na Linha do Tempo' },
      { keys: ['Ctrl', 'S'], description: 'Salvar projeto nativo (.garden)' },
      { keys: ['?'], description: 'Abrir este guia de atalhos' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                Atalhos de Teclado & Produtividade
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                  Ajuda
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Pressione a tecla <kbd className="px-1 py-0.2 bg-zinc-800 border border-zinc-700 rounded text-cyan-300 font-mono text-[10px]">?</kbd> a qualquer momento para abrir ou fechar esta janela.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title} className="space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                {category.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {category.items.map((item, idx) => (
                  <div
                    key={`${item.description}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
                  >
                    <span className="text-zinc-300 text-[11px] pr-2">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded shadow-xs font-mono font-semibold text-zinc-200 text-[10px]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
          <span>Dica: segure <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-[10px] text-zinc-300">Espaço</kbd> para pan rápido enquanto desenha.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
