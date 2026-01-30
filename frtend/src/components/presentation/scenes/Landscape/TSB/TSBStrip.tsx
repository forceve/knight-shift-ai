import React from 'react';
import { TSBFigure } from '../../../../../data/presentation';
import { TSBThumb } from './TSBThumb';

interface TSBStripProps {
  figures: TSBFigure[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  visible: boolean;
  dimmed: boolean;
  hint: string;
}

export const TSBStrip: React.FC<TSBStripProps> = ({ figures, selectedIndex, onSelect, visible, dimmed, hint }) => {
  return (
    <div 
      className={`
        absolute bottom-0 left-0 right-0
        flex flex-row items-center justify-center gap-3 px-6 py-3
        bg-slate-950/95 backdrop-blur-xl border-t border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]
        transition-all duration-500 ease-out transform
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
        ${dimmed ? 'opacity-85 grayscale-[0.3]' : ''}
      `}
      style={{ zIndex: 40, height: '20%' }} 
    >
        {/* Hint label */}
        {visible && (
          <div className="absolute top-[-32px] right-4 text-xs font-mono text-white/60 bg-black/80 px-3 py-1.5 rounded backdrop-blur-md border border-white/10 shadow-lg">
              {hint}
          </div>
        )}

        {/* Intro Text */}
        {visible && !dimmed && (
             <div className="absolute top-[-32px] left-4 text-xs font-sans text-cyan-400 font-semibold tracking-wide bg-black/80 px-3 py-1.5 rounded backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-900/20">
                 TSB confirms the same trend across time budgets.
             </div>
        )}

        {figures.map((fig, idx) => (
            <div key={fig.id} className="h-full w-[19%] min-w-[120px] max-w-[240px]">
                <TSBThumb 
                    figure={fig} 
                    selected={idx === selectedIndex} 
                    onClick={() => onSelect(idx)} 
                />
            </div>
        ))}
    </div>
  );
};
