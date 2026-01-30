import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TSBFigure } from '../../../../../data/presentation';

interface TSBHeroProps {
  figure: TSBFigure;
  visible: boolean;
}

export const TSBHero: React.FC<TSBHeroProps> = ({ figure, visible }) => {
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
          <motion.div
            key={figure.id}
            initial={{ y: 300, scale: 0.3, opacity: 0 }}
            animate={{ y: -50, scale: 1, opacity: 1 }}
            exit={{ y: -50, scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="relative w-[50vw] h-[50vh] bg-white rounded-xl shadow-2xl p-4 flex flex-col items-center justify-center border border-white/20"
          >
             {/* Header */}
             <div className="absolute top-4 left-6 text-xl font-bold text-slate-900">
                {figure.label}
             </div>
             
             {/* Image */}
             <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden mt-6 mb-2">
                 <img 
                    src={figure.src} 
                    alt={figure.label} 
                    className="max-w-full max-h-full object-contain"
                 />
             </div>

             {/* Footer */}
             <div className="text-slate-600 font-medium text-lg">
                {figure.takeaway}
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

