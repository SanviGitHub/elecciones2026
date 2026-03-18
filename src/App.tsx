/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { VotingPage } from './pages/VotingPage';
import { AdminPage } from './pages/AdminPage';
import { SplashScreen } from './components/SplashScreen';
import { Toaster } from 'react-hot-toast';
import { motion } from 'motion/react';

const Particles = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/20"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -1000],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <div className="bg-mesh"></div>
      <Particles />
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#fff',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#0f172a',
            },
          },
        }} 
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VotingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
