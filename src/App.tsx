/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { VotingPage } from './pages/VotingPage';
import { AdminPage } from './pages/AdminPage';
import { SplashScreen } from './components/SplashScreen';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
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
