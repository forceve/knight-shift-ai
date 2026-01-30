import React from 'react';
import { TSBFigure } from '../../../../../data/presentation';

interface TSBThumbProps {
  figure: TSBFigure;
  selected: boolean;
  onClick: () => void;
}

export const TSBThumb: React.FC<TSBThumbProps> = ({ figure, selected, onClick }) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        relative flex flex-col items-center justify-between p-2 rounded-lg cursor-pointer
        transition-all duration-200 ease-out border
        ${selected 
          ? 'scale-105 border-cyan-400 bg-slate-800 shadow-[0_0_15px_rgba(34,211,238,0.3)] z-10 opacity-100' 
          : 'scale-100 border-white/10 bg-slate-900/60 hover:bg-slate-800/80 opacity-60 hover:opacity-100'}
      `}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Label */}
      <div className={`text-xs font-mono mb-1 transition-colors ${selected ? 'text-cyan-300' : 'text-slate-400'}`}>
        {figure.label}
      </div>

      {/* Thumbnail Image - Forced White Background for Visibility */}
      <div className="flex-1 w-full relative overflow-hidden rounded bg-white mb-1 flex items-center justify-center border border-white/10">
        <img 
          src={figure.src} 
          alt={figure.label} 
          className="w-full h-full object-contain p-1"
        />
      </div>

      {/* Takeaway */}
      <div className={`text-[9px] leading-tight text-center transition-colors line-clamp-2 ${selected ? 'text-white' : 'text-slate-500'}`}>
        {figure.takeaway}
      </div>
    </div>
  );
};
