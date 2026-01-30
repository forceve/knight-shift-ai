import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

type TreeSpec = {
  seed: number;
  branching: number[];
  pvIndices: number[];
  prunedRatio: number;
  showQExtension: boolean;
};

type Props = {
  spec: TreeSpec;
  beat: number; // 0..5
  width?: number;
  height?: number;
  activeMoveIndex: number;
};

type Node = {
  id: string;
  x: number;
  y: number;
  depth: number;
  isPv: boolean;
  isPruned: boolean;
  isQ: boolean;
  parentId?: string;
};

export const SearchTreePanel: React.FC<Props> = ({ spec, beat, width = 800, height = 600, activeMoveIndex }) => {
  // Tree generation logic
  const treeData = useMemo(() => {
    // ... generation ...
    // Reuse existing logic, but tree structure is computed once
    // ...
    // Copy-paste your generation logic here or just rely on the fact that I'm only changing the render part
    // Actually search_replace needs context. I will replace the Viewport mapping and Render part.
    
    // NOTE: Need to replicate generation logic or wrap it?
    // Let's assume the user wants me to replace the whole component to be safe with new styling.
    
    const nodes: Node[] = [];
    const edges: { from: string; to: string; isPv: boolean; isPruned: boolean; isQ: boolean }[] = [];

    const root: Node = { id: 'root', x: 0.08, y: 0.5, depth: 0, isPv: true, isPruned: false, isQ: false };
    nodes.push(root);

    const generate = (parent: Node, depth: number, isParentPv: boolean) => {
      if (depth >= spec.branching.length) return;
      
      const count = spec.branching[depth];
      const pvIndex = spec.pvIndices[depth] ?? 0;
      
      let startY = 0.1;
      let endY = 0.9;
      
      if (depth > 0) {
        // Tighten spread rapidly to avoid overlap
        // Depth 1 spread (for Depth 2 children) must be < gap between Depth 1 nodes (~0.14)
        const spreads = [0.0, 0.12, 0.05, 0.02];
        const spread = spreads[depth] ?? 0.01;
        
        startY = parent.y - spread / 2;
        endY = parent.y + spread / 2;
      }

      for (let i = 0; i < count; i++) {
        // Robust PV: if parent is PV and this is the chosen child OR if there's only one child (forced move), it's PV.
        // Also ensure pvIndex is valid for this depth
        const validPvIndex = pvIndex < count ? pvIndex : 0; 
        const isPv = isParentPv && (i === validPvIndex || count === 1);
        const pseudoRand = (Math.sin(spec.seed * 1000 + depth * 100 + i) + 1) / 2;
        const isPruned = !isPv && (pseudoRand < spec.prunedRatio);

        const t = count > 1 ? i / (count - 1) : 0.5;
        const y = depth === 0 
           ? 0.15 + t * 0.7 // Tighter root spread
           : startY + t * (endY - startY);

        const x = 0.08 + (depth + 1) * 0.22;

        const nodeId = `${parent.id}-${i}`;
        const node: Node = { id: nodeId, x, y, depth: depth + 1, isPv, isPruned, isQ: false, parentId: parent.id };

        nodes.push(node);
        edges.push({ from: parent.id, to: nodeId, isPv, isPruned, isQ: false });

        generate(node, depth + 1, isPv);
      }
    };

    generate(root, 0, true);

    if (spec.showQExtension) {
       const pvLeaf = nodes.filter(n => n.isPv).sort((a,b) => b.depth - a.depth)[0];
       if (pvLeaf && pvLeaf.depth === spec.branching.length) {
          const qNode1: Node = { id: 'q1', x: pvLeaf.x + 0.12, y: pvLeaf.y - 0.03, depth: pvLeaf.depth + 1, isPv: true, isPruned: false, isQ: true, parentId: pvLeaf.id };
          const qNode2: Node = { id: 'q2', x: pvLeaf.x + 0.12, y: pvLeaf.y + 0.03, depth: pvLeaf.depth + 1, isPv: true, isPruned: false, isQ: true, parentId: pvLeaf.id };
          nodes.push(qNode1, qNode2);
          edges.push({ from: pvLeaf.id, to: qNode1.id, isPv: true, isPruned: false, isQ: true });
          edges.push({ from: pvLeaf.id, to: qNode2.id, isPv: true, isPruned: false, isQ: true });
       }
    }

    return { nodes, edges };
  }, [spec]);

  const pvDepthActive = Math.max(0, Math.min(spec.branching.length, activeMoveIndex + 1));
  // Use normalized coordinates 0..1000
  const toSvgX = (nx: number) => nx * 1000;
  const toSvgY = (ny: number) => ny * 1000;
  const visibleDepth = beat >= 3 ? 99 : Math.max(2, pvDepthActive + 1);

  return (
    <div className="w-full h-full relative">
        {/* Background Grid - subtle tech look */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
            <defs>
                <filter id="glow-pv" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Edges */}
            {treeData.edges.map((e, i) => {
                let visible = true;
                let opacity = 0.4;
                let strokeWidth = 2;
                let stroke = "#64748b"; // Slate 500

                const targetNode = treeData.nodes.find(n => n.id === e.to);
                const depth = targetNode?.depth || 1;
                if (depth > visibleDepth) visible = false;
                const onPvPath = e.isPv && depth <= pvDepthActive;

                if (beat >= 2 && e.isPruned) {
                    opacity = 0.2;
                    stroke = "#831843"; // Pink 900
                }
                
                if (beat >= 1 && onPvPath) {
                    stroke = "#fbbf24"; // Amber 400
                    strokeWidth = 5;
                    opacity = 1;
                } else if (beat >= 1 && e.isPv) {
                    stroke = "#f59e0b";
                    strokeWidth = 3.5;
                    opacity = 0.65;
                } else if (beat >= 1 && !e.isPv && !e.isPruned) {
                    stroke = "#ec4899"; // Pink 500
                    opacity = 0.6;
                }
                
                if (e.isQ) {
                    visible = beat >= 4;
                    stroke = "#fbbf24";
                    strokeWidth = 3;
                    opacity = 0.8;
                }

                if (!visible) return null;

                const startNode = treeData.nodes.find(n => n.id === e.from);
                const endNode = treeData.nodes.find(n => n.id === e.to);
                if (!startNode || !endNode) return null;

                return (
                    <motion.line
                        key={`e-${i}-${beat}`} // Force re-render on beat change to prevent state staleness
                        x1={toSvgX(startNode.x)}
                        y1={toSvgY(startNode.y)}
                        x2={toSvgX(endNode.x)}
                        y2={toSvgY(endNode.y)}
                        strokeDasharray={e.isQ ? "10 10" : "none"}
                        initial={{ pathLength: 0, opacity: 0, stroke, strokeWidth }}
                        animate={{ pathLength: 1, opacity, stroke, strokeWidth }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        filter={e.isPv && beat >= 1 ? "url(#glow-pv)" : undefined}
                    />
                );
            })}

            {/* Nodes */}
            {treeData.nodes.map((n, i) => {
                let visible = true;
                const depth = n.depth;
                if (depth > visibleDepth) visible = false;
                const onPvPath = n.isPv && depth <= pvDepthActive;
                
                let fill = "#64748b";
                let r = 6;
                let opacity = 0.8;

                if (beat >= 2 && n.isPruned) {
                    opacity = 0.2;
                    fill = "#831843"; // Pink 900
                    r = 4;
                }

                if (beat >= 1 && onPvPath) {
                    fill = "#f59e0b"; // Amber 500
                    r = 9;
                    opacity = 1;
                } else if (beat >= 1 && n.isPv) {
                    fill = "#fbbf24";
                    r = 7;
                    opacity = 0.8;
                } else if (beat >= 1 && !n.isPv && !n.isPruned) {
                    fill = "#fce7f3"; // Pink 100
                    opacity = 0.9;
                }

                if (n.isQ) {
                    visible = beat >= 4;
                    r = 5;
                    fill = "#f59e0b";
                }

                if (!visible) return null;

                return (
                    <motion.circle
                        key={`n-${i}-${beat}`} // Force re-render
                        cx={toSvgX(n.x)}
                        cy={toSvgY(n.y)}
                        r={r}
                        initial={{ scale: 0, opacity: 0, fill }}
                        animate={{ scale: 1, opacity, fill }}
                        transition={{ duration: 0.3, delay: n.depth * 0.05 }}
                        filter={n.isPv && beat >= 1 ? "url(#glow-pv)" : undefined}
                    />
                );
            })}
        </svg>
        
        <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[11px] text-slate-500 font-mono pointer-events-none border-t border-slate-700/50 pt-2">
           <span>ROOT</span>
           <span>PLY 1</span>
           <span>PLY 2</span>
           <span className={beat >= 3 ? "text-slate-400" : "opacity-0"}>PLY 3+ (ID)</span>
           <span className={beat >= 4 && spec.showQExtension ? "text-amber-500" : "opacity-0"}>Q-SEARCH</span>
        </div>
    </div>
  );
};
