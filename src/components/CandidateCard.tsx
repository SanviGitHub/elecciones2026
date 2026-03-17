import React from 'react';
import { motion } from 'motion/react';
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
      whileHover={!isPaused ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isPaused ? { scale: 0.98 } : {}}
      onClick={() => !isPaused && onSelect(candidate.id)}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
        isPaused
          ? 'cursor-not-allowed border-blue-200/20 bg-blue-900/10 opacity-70 grayscale-[60%]'
          : isSelected
          ? 'cursor-pointer border-blue-400/50 bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
          : 'cursor-pointer border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.2)]'
      } backdrop-blur-xl`}
    >
      {/* Frozen Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/5 to-blue-300/10 backdrop-blur-[1px] flex items-center justify-end pr-6 pointer-events-none">
          <div className="bg-blue-900/80 text-blue-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-blue-400/30 backdrop-blur-md">
            <Snowflake className="h-4 w-4 animate-pulse" />
            <span className="font-bold text-xs tracking-wider uppercase">Congelado</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-5">
        <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 transition-colors duration-300 ${isSelected && !isPaused ? 'border-blue-400' : 'border-white/20'} bg-white/10 shadow-inner`}>
          {candidate.photoUrl ? (
            <img
              src={candidate.photoUrl}
              alt={candidate.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600/80 to-violet-600/80 text-xl font-bold text-white backdrop-blur-sm">
              {candidate.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white tracking-wide">{candidate.name}</h3>
          <p className="text-sm text-blue-300/80 uppercase tracking-wider text-xs font-medium mt-1">{candidate.role}</p>
        </div>
        {isSelected && !isPaused && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          >
            <CheckCircle2 size={28} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
