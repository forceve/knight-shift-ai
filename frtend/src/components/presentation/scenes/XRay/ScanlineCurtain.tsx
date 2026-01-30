import React from 'react';
import { motion } from 'framer-motion';

export const ScanlineCurtain: React.FC = () => {
  return (
    <motion.div
      className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.2, duration: 0.1 }} // Remove from DOM mentally after done
    >
        <motion.div
            className="absolute inset-0 bg-slate-950/70 backdrop-grayscale backdrop-contrast-75"
            initial={{ clipPath: "inset(0 0 0 0)" }}
            animate={{ clipPath: "inset(0 0 0 100%)" }}
            transition={{ duration: 1.0, ease: "easeInOut", delay: 0.1 }}
        >
            {/* Scanline edge simulation */}
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.8)] translate-x-[50%]" />
        </motion.div>
    </motion.div>
  );
};





