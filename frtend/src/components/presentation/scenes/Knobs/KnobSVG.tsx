import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type KnobProps = {
  label: string;
  value: number; // 0..100
  active?: boolean;
  caption?: string;
  oneLiner?: string;
};

const KnobSVG: React.FC<KnobProps> = ({ label, value, active = false, caption }) => {
  // Map 0..100 to -135..+135 degrees
  const angle = -135 + (value / 100) * 270;

  // Generate groove lines for the texture
  const grooveCount = 16;
  const grooves = Array.from({ length: grooveCount }).map((_, i) => {
    const grooveAngle = (i / grooveCount) * 360;
    return (
      <line
        key={i}
        x1="50"
        y1="15"
        x2="50"
        y2="25"
        stroke={active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}
        strokeWidth="2"
        transform={`rotate(${grooveAngle} 50 50)`}
      />
    );
  });

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 select-none">
      <div className="relative w-22 h-22 md:w-26 md:h-26" style={{ width: "88px", height: "88px" }}>
        {/* Glow Ring (Active only) */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1.1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl"
            />
          )}
        </AnimatePresence>

        {/* Main SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
          {/* Defs for gradients */}
          <defs>
            <radialGradient id="knobGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#2a2f3e" />
              <stop offset="90%" stopColor="#1a1e29" />
              <stop offset="100%" stopColor="#0f111a" />
            </radialGradient>
            
            <filter id="innerShadow">
              <feOffset dx="0" dy="1" />
              <feGaussianBlur stdDeviation="1" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="black" floodOpacity="0.7" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>
          </defs>

          {/* Outer Ring / Tick Marks (Static) */}
          <g>
             {/* We draw a tick every 10 degrees from -135 to 135 */}
             {Array.from({ length: 28 }).map((_, i) => {
               const tickAngle = -135 + i * 10;
               const isMajor = i % 9 === 0; // -135, -45, 45, 135 roughly
               return (
                 <line
                   key={i}
                   x1="50"
                   y1="2"
                   x2="50"
                   y2={isMajor ? "8" : "5"}
                   stroke={active ? (isMajor ? "#4ee1a0" : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.1)"}
                   strokeWidth={isMajor ? 2 : 1}
                   transform={`rotate(${tickAngle} 50 50)`}
                 />
               );
             })}
          </g>

          {/* Knob Body (Rotates) */}
          <motion.g
            animate={{ rotate: angle }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            style={{ originX: "50px", originY: "50px" }}
          >
            {/* Base Circle */}
            <circle cx="50" cy="50" r="38" fill="url(#knobGradient)" stroke="#333" strokeWidth="1" />
            
            {/* Top bevel highlight */}
            <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            {/* Grooves Texture */}
            <g>{grooves}</g>

            {/* Indicator Dot/Line on the knob body itself? 
                User asked for "Groove texture disk rotates". 
                "Pointer notch: recommended fixed at 12 o'clock (does not rotate), disk rotates below".
                
                Wait, if the pointer is fixed at 12 o'clock, and the disk rotates, 
                then the disk needs a mark that moves relative to the fixed pointer?
                OR the disk rotates and we see the rotation. 
                User said: "Pointer notch: recommended fixed at 12 o'clock (not rotating), disk rotates below -> looks more like real hardware".
                Usually this means there's a mark on the chassis (fixed) and a line on the knob (rotating).
                OR the knob has a texture and we rotate it against a fixed mark.
                
                Let's put a small indicator line on the knob itself that rotates with it, 
                and maybe a fixed triangle at the top outside.
            */}
             <line x1="50" y1="12" x2="50" y2="24" stroke={active ? "#4ee1a0" : "#888"} strokeWidth="3" strokeLinecap="round" />
          </motion.g>

          {/* Fixed Notch at 12 o'clock (Static overlay) */}
          <path d="M 50 6 L 47 2 L 53 2 Z" fill="#666" />

        </svg>

        {/* Value Overlay (Center or Bottom) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-[13px] md:text-sm font-mono font-bold ${active ? "text-cyan-400" : "text-slate-600"}`}>
            {Math.round(value)}
          </span>
        </div>
      </div>

      {/* Label & Caption */}
      <div className="text-center">
        <div className={`text-[11px] md:text-xs font-bold uppercase tracking-widest ${active ? "text-white" : "text-slate-500"}`}>
          {label}
        </div>
        {caption && (
          <div className="text-[10px] md:text-[11px] text-slate-400 font-mono mt-1 opacity-75">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnobSVG;
