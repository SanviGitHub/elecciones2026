import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate } from '../types';
import { CheckCircle2, Snowflake } from 'lucide-react';

interface CandidateCardProps {
  key?: React.Key;
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function CandidateCard({ candidate, isSelected, onSelect }: CandidateCardProps) {
  const isPaused = candidate.isPaused;

  return (
    <motion.div
      whileHover={!isPaused ? { scale: 1.02, y: -4 } : {}}
      whileTap={!isPaused ? { scale: 0.98 } : {}}
      onClick={() => !isPaused && onSelect(candidate.id)}
      className={`relative overflow-hidden rounded-[1.5rem] p-[1px] transition-all duration-500 ${
        isPaused
          ? 'cursor-not-allowed opacity-60 grayscale-[80%]'
          : isSelected
          ? 'cursor-pointer shadow-[0_0_40px_rgba(59,130,246,0.4)] z-10'
          : 'cursor-pointer hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:z-10'
      }`}
    >
      {/* Animated Gradient Border for Selected State */}
      <AnimatePresence>
        {isSelected && !isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-gradient-xy"
          />
        )}
      </AnimatePresence>

      {/* Default Border */}
      {!isSelected && (
        <div className="absolute inset-0 z-0 bg-white/[0.08]" />
      )}

      {/* Inner Content */}
      <div className={`relative z-10 h-full w-full rounded-[calc(1.5rem-1px)] p-5 backdrop-blur-xl transition-colors duration-500 ${
        isSelected && !isPaused ? 'bg-[#0a0a0a]/90' : 'bg-white/[0.03] hover:bg-white/[0.06]'
      }`}>
        
        {/* Frozen Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent to-blue-900/20 backdrop-blur-[2px] flex items-center justify-end pr-6 pointer-events-none rounded-[calc(1.5rem-1px)]">
            <div className="bg-blue-950/90 text-blue-300 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl border border-blue-500/30 backdrop-blur-md">
              <Snowflake className="h-4 w-4 animate-pulse" />
              <span className="font-bold text-xs tracking-widest uppercase">Congelado</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-5">
          <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] transition-all duration-500 ${
            isSelected && !isPaused ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110' : 'border-white/10'
          } bg-white/5`}>
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.name}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600/80 to-violet-600/80 text-xl font-bold text-white">
                {candidate.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`text-lg font-bold tracking-wide transition-colors duration-300 ${
              isSelected && !isPaused ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300' : 'text-white'
            }`}>
              {candidate.name}
            </h3>
            {isSelected && !isPaused && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-blue-400/80 font-medium mt-1 uppercase tracking-wider"
              >
                Seleccionado
              </motion.p>
            )}
          </div>

          {isSelected && !isPaused && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.8)] bg-white/10 p-2 rounded-full"
            >
              <CheckCircle2 size={24} className="text-blue-400" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
