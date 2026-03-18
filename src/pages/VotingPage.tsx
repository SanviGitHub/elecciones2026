import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, serverTimestamp, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Candidate, Settings } from '../types';
import { getDeviceInfo, hasVoted, markAsVoted, clearVotedStatus } from '../utils/device';
import { CandidateCard } from '../components/CandidateCard';
import { Loader2, CheckCircle, AlertCircle, Clock, Construction, Info, ShieldCheck, HelpCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export function VotingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(hasVoted());
  const [verifyingVote, setVerifyingVote] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
      } else {
        // Default settings
        setSettings({
          maintenanceMode: false,
          restrictionMode: 'light',
          votingOpenTime: null,
          votingCloseTime: null
        });
      }
    }, (error) => {
      console.error("Error loading settings:", error);
      // Fallback to allow the app to load even if settings fail
      setSettings({
        maintenanceMode: false,
        restrictionMode: 'light',
        votingOpenTime: null,
        votingCloseTime: null
      });
    });

    // Fallback timeout for settings
    const settingsTimeout = setTimeout(() => {
      setSettings(prev => prev || {
        maintenanceMode: false,
        restrictionMode: 'light',
        votingOpenTime: null,
        votingCloseTime: null
      });
    }, 3000);

    return () => {
      unsubSettings();
      clearTimeout(settingsTimeout);
    };
  }, []);

  useEffect(() => {
    async function verifyVoteStatus() {
      if (!voted) {
        setVerifyingVote(false);
        return;
      }
      
      try {
        // Add a 5 second timeout to the entire verification process
        const verificationPromise = (async () => {
          const { deviceId, hwid } = await getDeviceInfo();
          
          let hasVotedDb = false;
          if (settings?.restrictionMode === 'strict' && hwid) {
            const qHwid = query(collection(db, 'votes'), where('hwid', '==', hwid));
            const existingHwid = await getDocs(qHwid);
            if (!existingHwid.empty) hasVotedDb = true;
          }
          
          if (!hasVotedDb) {
            const qDevice = query(collection(db, 'votes'), where('deviceId', '==', deviceId));
            const existingDevice = await getDocs(qDevice);
            if (!existingDevice.empty) hasVotedDb = true;
          }
          
          if (!hasVotedDb) {
            // Admin purged this device's vote
            clearVotedStatus();
            setVoted(false);
          }
        })();

        await Promise.race([
          verificationPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 5000))
        ]);
      } catch (e) {
        console.error("Error verifying vote status", e);
        // If it times out or fails, we assume they haven't voted if we couldn't verify,
        // but since they have the local flag, we'll keep it to be safe, or we could clear it.
        // Let's keep the local flag to prevent double voting if offline.
      } finally {
        setVerifyingVote(false);
      }
    }

    if (settings) {
      verifyVoteStatus();
    }
  }, [voted, settings]);

  useEffect(() => {
    if (verifyingVote) return;
    
    if (voted) {
      setLoading(false);
      return;
    }

    const unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Candidate[];
      setCandidates(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching candidates:', err);
      setError('Error al cargar los candidatos. Revisa tu conexión.');
      setLoading(false);
    });

    // Fallback timeout to ensure loading state is cleared even if Firestore is slow/blocked
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubCandidates();
      clearTimeout(loadingTimeout);
    };
  }, [voted, verifyingVote]);

  const handleSelect = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
  };

  const handleSubmit = async () => {
    if (!selectedCandidateId) {
      setError('Por favor, selecciona un candidato.');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const { deviceId, hwid } = await getDeviceInfo();

      // Double check if device already voted in DB to prevent localstorage bypass
      let hasVotedDb = false;
      if (settings?.restrictionMode === 'strict' && hwid) {
        const qHwid = query(collection(db, 'votes'), where('hwid', '==', hwid));
        const existingHwid = await getDocs(qHwid);
        if (!existingHwid.empty) hasVotedDb = true;
      }
      
      if (!hasVotedDb) {
        const qDevice = query(collection(db, 'votes'), where('deviceId', '==', deviceId));
        const existingDevice = await getDocs(qDevice);
        if (!existingDevice.empty) hasVotedDb = true;
      }
      
      if (hasVotedDb) {
        markAsVoted();
        setVoted(true);
        setSubmitting(false);
        return;
      }

      // Fetch IP
      let ip = 'Desconocida';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (e) {
        console.error('Failed to fetch IP', e);
      }

      // Submit vote
      const voteData: any = {
        candidateId: selectedCandidateId,
        deviceId,
        timestamp: serverTimestamp(),
        ip
      };
      if (hwid) voteData.hwid = hwid;

      await addDoc(collection(db, 'votes'), voteData);

      markAsVoted();
      setVoted(true);
      toast.success('¡Voto registrado exitosamente!');
    } catch (err) {
      console.error('Error submitting votes:', err);
      setError('Hubo un error al enviar tu voto. Inténtalo de nuevo.');
      toast.error('Error al registrar el voto');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
      </div>
    );
  }

  if (settings.maintenanceMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex max-w-md flex-col items-center rounded-[2rem] glass-panel p-10"
        >
          <div className="mb-6 rounded-full bg-yellow-500/20 p-5 text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            <Construction className="h-16 w-16" />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white">Sanvy Studios</h1>
          <p className="text-blue-100/80 text-lg">
            Volvemos pronto. El sistema está en mantenimiento.
          </p>
        </motion.div>
      </div>
    );
  }

  const getMillis = (time: any) => {
    if (!time) return null;
    if (typeof time.toMillis === 'function') return time.toMillis();
    if (time instanceof Date) return time.getTime();
    if (typeof time === 'number') return time;
    return null;
  };

  const openTime = getMillis(settings.votingOpenTime);
  const closeTime = getMillis(settings.votingCloseTime);
  const isBeforeOpen = openTime && now.getTime() < openTime;
  const isAfterClose = closeTime && now.getTime() > closeTime;

  if (isBeforeOpen) {
    const diff = openTime - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex max-w-md flex-col items-center rounded-[2rem] glass-panel p-10"
        >
          <div className="mb-6 rounded-full bg-blue-500/20 p-5 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Clock className="h-16 w-16" />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white">Próximamente</h1>
          <p className="text-blue-100/80 text-lg mb-6">
            La votación aún no ha comenzado.
          </p>
          <div className="flex gap-4 text-2xl font-mono font-bold text-white">
            <div className="flex flex-col items-center"><span className="bg-white/10 px-4 py-2 rounded-xl">{hours.toString().padStart(2, '0')}</span><span className="text-xs mt-1 text-blue-200/60">HRS</span></div>
            <span className="py-2">:</span>
            <div className="flex flex-col items-center"><span className="bg-white/10 px-4 py-2 rounded-xl">{minutes.toString().padStart(2, '0')}</span><span className="text-xs mt-1 text-blue-200/60">MIN</span></div>
            <span className="py-2">:</span>
            <div className="flex flex-col items-center"><span className="bg-white/10 px-4 py-2 rounded-xl">{seconds.toString().padStart(2, '0')}</span><span className="text-xs mt-1 text-blue-200/60">SEC</span></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isAfterClose) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex max-w-md flex-col items-center rounded-[2rem] glass-panel p-10"
        >
          <div className="mb-6 rounded-full bg-red-500/20 p-5 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <Clock className="h-16 w-16" />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white">Votación Cerrada</h1>
          <p className="text-blue-100/80 text-lg">
            El período de votación ha finalizado. Gracias por participar.
          </p>
        </motion.div>
      </div>
    );
  }

  if (voted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex max-w-md flex-col items-center rounded-[2rem] glass-panel p-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6 rounded-full bg-green-500/20 p-5 text-green-400 shadow-[0_0_30px_rgba(74,222,128,0.3)]"
          >
            <CheckCircle className="h-16 w-16" />
          </motion.div>
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-md">¡Voto Registrado!</h1>
          <p className="text-blue-100/80 text-lg leading-relaxed">
            Tu voto ha sido guardado exitosamente. Gracias por participar en las elecciones de 2do 4ta.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 pb-32 text-white sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-16 text-center">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="bg-gradient-to-br from-blue-300 via-white to-violet-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl drop-shadow-sm">
              Elecciones 2do 4ta
            </h1>
          </motion.div>
          <motion.p 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-xl text-blue-200/80 font-medium tracking-wide"
          >
            Selecciona a tus representantes para este año.
          </motion.p>
        </header>

        {/* Instructions Section */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-12 rounded-[2rem] glass-panel p-6 sm:p-8 border-l-4 border-l-blue-500"
        >
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Instrucciones de Votación</h2>
          </div>
          <ul className="space-y-3 text-blue-100/80 text-sm sm:text-base">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-400/20">1</span>
              <p>Selecciona <strong>un candidato</strong> de la lista general.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-400/20">2</span>
              <p>El candidato más votado será Delegado, el segundo Subdelegado y el tercero Tercer Delegado.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-400/20">3</span>
              <p>Los candidatos marcados como <strong className="text-blue-300">Congelados</strong> no pueden recibir votos en este momento.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs border border-blue-400/20">4</span>
              <p>Revisa tu selección y haz clic en <strong>Confirmar Voto</strong> al final de la página.</p>
            </li>
          </ul>
        </motion.section>

        <div className="space-y-12">
          <motion.section 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
            className="rounded-[2rem] glass-panel p-6 sm:p-10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">Candidatos</h2>
              
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-blue-400/50" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar candidato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-blue-200/50 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
                />
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <p className="text-blue-200/60 italic">
                {searchQuery ? 'No se encontraron candidatos con ese nombre.' : 'No hay candidatos registrados.'}
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {filteredCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={selectedCandidateId === candidate.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </motion.section>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0f172a]/80 p-5 backdrop-blur-2xl sm:static sm:mt-16 sm:border-none sm:bg-transparent sm:p-0 z-50"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
        >
          <div className="mx-auto max-w-3xl">
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedCandidateId}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600/90 to-violet-600/90 px-8 py-5 text-xl font-bold text-white shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] disabled:pointer-events-none disabled:opacity-50 backdrop-blur-md border border-white/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Enviando voto...
                </>
              ) : (
                'Confirmar Voto'
              )}
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20 border-t border-white/10 pt-8 pb-8 text-center sm:pb-0"
        >
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2 text-blue-200/50 text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Votación Segura y Anónima</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20"></div>
            <div className="flex items-center gap-2 text-blue-200/50 text-sm">
              <HelpCircle className="h-4 w-4" />
              <span>Soporte: admin@sanvystudios.com</span>
            </div>
          </div>
          <p className="mt-6 text-xs text-blue-200/30 font-mono tracking-widest uppercase">
            Powered by Sanvy Studios © {new Date().getFullYear()}
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
