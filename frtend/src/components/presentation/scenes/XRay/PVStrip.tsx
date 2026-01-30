import React from 'react';

type Props = {
  pvUci: string[];
  beat: number;
  level: string;
  activeIndex?: number;
};

export const PVStrip: React.FC<Props> = ({ pvUci, beat, level, activeIndex = -1 }) => {
  if (beat < 1) return <div className="h-10 w-full" />; // Spacer

  // Show full PV, but highlight progression
  const visibleLength = pvUci.length;
  const visibleMoves = pvUci.slice(0, visibleLength);

  return (
    <div className="flex items-center gap-2 overflow-hidden p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-md shadow-lg relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/80"></div>
        <div className="text-[10px] font-black text-amber-500 mr-2 shrink-0 tracking-widest pl-2">PV</div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mask-linear-fade">
            {visibleMoves.map((move, i) => {
                const isActive = i === activeIndex;
                const isPast = i < activeIndex;
                
                return (
                <div 
                    key={i} 
                    className={`
                        px-2 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap transition-all duration-300
                        ${isActive 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] scale-105' 
                            : isPast 
                                ? 'bg-slate-800 text-slate-400 border border-slate-700/50'
                                : 'bg-slate-800/80 text-slate-500 border border-slate-700'}
                    `}
                >
                    {move}
                </div>
            )})}
            {visibleLength < pvUci.length && (
                <div className="text-slate-600 text-xs tracking-widest animate-pulse self-end pb-1">...</div>
            )}
        </div>
        {level === 'L2' && (
             <div className="ml-auto text-[9px] text-slate-500 italic shrink-0 pr-1">
                (top-3)
             </div>
        )}
    </div>
  );
};
