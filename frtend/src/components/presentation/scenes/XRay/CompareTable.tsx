import React from 'react';

type Props = {
  lines: string[];
};

export const CompareTable: React.FC<Props> = ({ lines }) => {
  return (
    <div className="w-full bg-slate-900/95 border border-slate-700 rounded-xl p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">Configuration Bridge</h3>
        <div className="space-y-3 font-mono text-sm">
            {lines.map((line, i) => {
                const parts = line.split('|');
                const label = parts[0];
                const rest = parts.slice(1);
                
                // Highlight based on row index
                const isUlt = label.includes('ULT');
                
                return (
                    <div key={i} className={`flex flex-col md:flex-row md:items-center gap-2 p-2 rounded ${isUlt ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-slate-800/30'}`}>
                        <div className={`font-bold w-32 shrink-0 ${isUlt ? 'text-indigo-300' : 'text-slate-300'}`}>
                            {label}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                            {rest.map((chip, j) => (
                                <span key={j} className="bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50">
                                    {chip.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};





