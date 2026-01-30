import React from 'react';

type Metrics = {
  depthLabel: string;
  timeMs: number;
  nodes: number;
  cutoffs: number;
  prunedRatio: number;
  quiescence: boolean;
};

type Props = {
  metrics: Metrics;
  beat: number;
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

export const MetricsCard: React.FC<Props> = ({ metrics, beat }) => {
  const showCutoffs = beat >= 2;
  const showQuiescence = beat >= 4;

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-5 font-mono text-sm shadow-xl backdrop-blur-xl w-full relative overflow-hidden group hover:border-slate-500/50 transition-colors">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
         <div className="w-16 h-16 rounded-full bg-cyan-500 blur-2xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-6 relative z-10">
        <div className="col-span-2 pb-3 border-b border-slate-700/50 mb-1">
            <div className="text-[10px] text-cyan-400/80 uppercase tracking-widest font-bold mb-1">Search Depth</div>
            <div className="text-2xl font-black text-white tracking-tight">{metrics.depthLabel}</div>
        </div>

        <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Time/Move</div>
            <div className="text-lg text-white font-bold font-sans">
                {metrics.timeMs < 100 ? '~' : ''}{metrics.timeMs}<span className="text-xs font-normal text-slate-500 ml-0.5">ms</span>
            </div>
        </div>

        <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Nodes</div>
            <div className="text-lg text-white font-bold font-sans">~{formatNumber(metrics.nodes)}</div>
        </div>

        <div className={`transition-all duration-700 ${showCutoffs ? 'opacity-100 translate-y-0' : 'opacity-20 blur-[2px] translate-y-2'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Cutoffs</div>
            <div className="text-amber-400 font-bold font-sans text-base">
               ~{formatNumber(metrics.cutoffs)} <span className="text-xs text-amber-500/60 font-mono ml-1">{(metrics.prunedRatio * 100).toFixed(0)}%</span>
            </div>
        </div>

        <div className={`transition-all duration-700 ${showQuiescence ? 'opacity-100 translate-y-0' : 'opacity-20 blur-[2px] translate-y-2'}`}>
             <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Quiescence</div>
             <div className={`font-bold font-sans text-base flex items-center gap-1.5 ${metrics.quiescence ? 'text-emerald-400' : 'text-slate-500'}`}>
                {metrics.quiescence ? (
                    <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        ACTIVE
                    </>
                ) : 'OFF'}
             </div>
        </div>
      </div>
    </div>
  );
};

