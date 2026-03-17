import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 2.5 seconds total duration
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 800); // Wait for exit animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Generate random particles (reduced for performance)
  const particles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#050505]"
        >
          {/* Particles Background */}
          <div className="absolute inset-0 z-0 opacity-40">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-blue-400/50 blur-[1px] will-change-transform"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                }}
                animate={{
                  y: [0, -50, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </div>

          {/* Glowing Orbs (Simplified for performance) */}
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-600/10 blur-[40px] z-0 will-change-transform"
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Loading Ring */}
            <div className="relative flex items-center justify-center mb-8">
              <motion.div
                className="absolute w-32 h-32 rounded-full border-t-2 border-r-2 border-blue-400/80 shadow-[0_0_10px_rgba(96,165,250,0.3)] will-change-transform"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute w-24 h-24 rounded-full border-b-2 border-l-2 border-violet-400/80 shadow-[0_0_10px_rgba(167,139,250,0.3)] will-change-transform"
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              {/* Logo / Initial */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              >
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-300 to-violet-300">S</span>
              </motion.div>
            </div>

            {/* Text Animation */}
            <div className="overflow-hidden relative">
              <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white/70"
              >
                Sanvy Studios
              </motion.h1>
              {/* Gradient Mask Sweep */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.8 }}
              />
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="mt-4 text-sm font-medium tracking-[0.3em] text-blue-300/50 uppercase"
            >
              Voting System
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
