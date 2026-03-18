import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Candidate, Vote, Settings, AuditLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { Loader2, Users, Plus, Trash2, Settings as SettingsIcon, ShieldAlert, Power, Pause, Play, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [settings, setSettings] = useState<Settings>({
    maintenanceMode: false,
    restrictionMode: 'light',
    votingOpenTime: null,
    votingCloseTime: null
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newVoteCandidateId, setNewVoteCandidateId] = useState('');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  const [searchDevice, setSearchDevice] = useState('');

  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Candidate[];
      setCandidates(data);
    });

    const unsubVotes = onSnapshot(collection(db, 'votes'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Vote[];
      setVotes(data);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
      }
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AuditLog[];
      setAuditLogs(data.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
        const timeB = b.timestamp?.toMillis?.() || (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
        return timeB - timeA;
      }));
      setLoading(false);
    });

    return () => {
      unsubCandidates();
      unsubVotes();
      unsubSettings();
      unsubLogs();
    };
  }, []);

  const logAction = async (action: string, details: string) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        action,
        details,
        timestamp: new Date(),
        adminId: 'admin' // In a real app, this would be the logged-in admin's ID
      });
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-[2rem] glass-panel p-10 text-center"
        >
          <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold text-white tracking-tight">God Mode</h1>
          <p className="mb-8 text-blue-200/60">Ingresa la contraseña maestra</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (password === 'admin123') {
              setIsAuthenticated(true);
              toast.success('Acceso concedido');
              logAction('LOGIN', 'Admin logged in');
            } else {
              setLoginError(true);
              toast.error('Contraseña incorrecta');
            }
          }}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError(false);
              }}
              placeholder="Contraseña"
              className={`w-full rounded-2xl px-5 py-4 mb-4 glass-input ${loginError ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50' : ''}`}
            />
            <button type="submit" className="w-full rounded-2xl py-4 font-bold text-white glass-button-primary">
              Ingresar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center relative z-10">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
      </div>
    );
  }

  const getResults = () => {
    const results = candidates.map((candidate) => {
      const voteCount = votes.filter((v) => v.candidateId === candidate.id).length;
      return { name: candidate.name, votos: voteCount };
    });
    return results.sort((a, b) => b.votos - a.votos);
  };

  const totalVoters = new Set(votes.map((v) => v.deviceId)).size;

  // Actions
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const candidateData: any = { name: newName.trim(), isPaused: false };
      if (newPhotoUrl.trim()) candidateData.photoUrl = newPhotoUrl.trim();
      await addDoc(collection(db, 'candidates'), candidateData);
      logAction('ADD_CANDIDATE', `Added candidate ${newName.trim()}`);
      toast.success('Candidato agregado');
      setNewName(''); setNewPhotoUrl('');
    } catch (err) {
      toast.error('Error al agregar candidato');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'candidates', id));
      logAction('DELETE_CANDIDATE', `Deleted candidate ${name}`);
      toast.success('Candidato eliminado');
    } catch (err) {
      toast.error('Error al eliminar candidato');
    }
  };

  const handleTogglePauseCandidate = async (id: string, name: string, isPaused: boolean) => {
    try {
      await updateDoc(doc(db, 'candidates', id), { isPaused: !isPaused });
      logAction('TOGGLE_CANDIDATE', `${!isPaused ? 'Paused' : 'Resumed'} candidate ${name}`);
      toast.success(`Candidato ${!isPaused ? 'pausado' : 'reanudado'}`);
    } catch (err) {
      toast.error('Error al actualizar candidato');
    }
  };

  const handleAddVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoteCandidateId) return;
    setIsSubmittingVote(true);
    try {
      await addDoc(collection(db, 'votes'), {
        candidateId: newVoteCandidateId,
        deviceId: `manual-${Date.now()}`,
        timestamp: new Date()
      });
      logAction('ADD_MANUAL_VOTE', `Added manual vote for candidate ${newVoteCandidateId}`);
      toast.success('Voto manual agregado');
      setNewVoteCandidateId('');
    } catch (err) {
      toast.error('Error al agregar voto');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleDeleteVote = async (id: string, deviceId: string) => {
    try {
      await deleteDoc(doc(db, 'votes', id));
      logAction('DELETE_VOTE', `Deleted vote from device ${deviceId}`);
      toast.success('Voto eliminado');
    } catch (err) {
      toast.error('Error al eliminar voto');
    }
  };

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { ...settings, ...updates }, { merge: true });
      logAction('UPDATE_SETTINGS', `Updated settings: ${JSON.stringify(updates)}`);
      toast.success('Configuración actualizada');
    } catch (err) {
      toast.error('Error al actualizar configuración');
    }
  };

  const handleGlobalReset = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar TODOS los votos? Esta acción no se puede deshacer.')) return;
    try {
      const batch = writeBatch(db);
      votes.forEach(v => {
        batch.delete(doc(db, 'votes', v.id));
      });
      await batch.commit();
      logAction('GLOBAL_RESET', 'Deleted all votes');
      toast.success('Todos los votos han sido eliminados');
    } catch (err) {
      toast.error('Error al reiniciar votos');
    }
  };

  const handleSelectivePurge = async () => {
    if (!searchDevice.trim()) return;
    try {
      const q = query(collection(db, 'votes'), where('deviceId', '==', searchDevice.trim()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast.error('No se encontraron votos para ese dispositivo');
        return;
      }
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      logAction('SELECTIVE_PURGE', `Deleted votes for device ${searchDevice}`);
      toast.success(`Se eliminaron ${snapshot.size} votos del dispositivo`);
      setSearchDevice('');
    } catch (err) {
      toast.error('Error al purgar dispositivo');
    }
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Candidate ID,Device ID,HWID,IP,Timestamp\n"
      + votes.map(v => `${v.id},${v.candidateId},${v.deviceId},${v.hwid || ''},${v.ip || ''},${v.timestamp?.toDate ? v.timestamp.toDate().toISOString() : ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "votos_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAction('EXPORT_DATA', 'Exported votes to CSV');
    toast.success('Datos exportados');
  };

  return (
    <div className="min-h-screen px-4 py-12 text-white sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <h1 className="bg-gradient-to-br from-blue-300 via-white to-violet-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl drop-shadow-sm">
              God Mode
            </h1>
            <p className="mt-3 text-lg text-blue-200/80 font-medium tracking-wide">Panel de Control Avanzado</p>
          </div>
          <div className="flex items-center gap-4 rounded-3xl glass-panel px-8 py-5">
            <div className="rounded-full bg-blue-500/20 p-4 text-blue-400 shadow-inner border border-blue-400/20">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-blue-200/60 uppercase tracking-wider font-semibold">Total Votantes</p>
              <p className="text-3xl font-extrabold text-white drop-shadow-md">{totalVoters}</p>
            </div>
          </div>
        </header>

        {/* Settings & Security Panel */}
        <div className="mb-8 grid gap-8 lg:grid-cols-3">
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[2rem] glass-panel p-8 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <SettingsIcon className="text-blue-400 h-6 w-6" />
              <h2 className="text-2xl font-bold text-white tracking-tight">Configuración Global</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <p className="font-bold text-white">Modo Mantenimiento</p>
                    <p className="text-xs text-blue-200/60">Desactiva la web para todos</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ maintenanceMode: !settings.maintenanceMode })}
                    className={`p-3 rounded-xl transition-colors ${settings.maintenanceMode ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                  >
                    <Power className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <p className="font-bold text-white">Modo de Restricción</p>
                    <p className="text-xs text-blue-200/60">{settings.restrictionMode === 'strict' ? 'Huella Digital (Estricto)' : 'Cookies (Leve)'}</p>
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ restrictionMode: settings.restrictionMode === 'strict' ? 'light' : 'strict' })}
                    className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold text-sm hover:bg-blue-500/30 transition-colors"
                  >
                    Cambiar a {settings.restrictionMode === 'strict' ? 'Leve' : 'Estricto'}
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-white mb-3">Cronograma de Votación</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-blue-200/60 block mb-1">Apertura</label>
                      <input 
                        type="datetime-local" 
                        value={settings.votingOpenTime?.toDate ? format(settings.votingOpenTime.toDate(), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => handleUpdateSettings({ votingOpenTime: e.target.value ? new Date(e.target.value) : null })}
                        className="w-full rounded-xl px-3 py-2 glass-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-blue-200/60 block mb-1">Cierre</label>
                      <input 
                        type="datetime-local" 
                        value={settings.votingCloseTime?.toDate ? format(settings.votingCloseTime.toDate(), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => handleUpdateSettings({ votingCloseTime: e.target.value ? new Date(e.target.value) : null })}
                        className="w-full rounded-xl px-3 py-2 glass-input text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-white mb-2">Purgado Selectivo</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Device ID" 
                      value={searchDevice}
                      onChange={e => setSearchDevice(e.target.value)}
                      className="flex-1 rounded-xl px-3 py-2 glass-input text-sm"
                    />
                    <button onClick={handleSelectivePurge} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleGlobalReset}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-bold transition-colors"
                >
                  <ShieldAlert className="h-5 w-5" />
                  GLOBAL RESET (Pánico)
                </button>
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-[2rem] glass-panel p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Exportar</h2>
              <button onClick={handleExportData} className="p-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30">
                <Download className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-blue-200/60 mb-4">Descarga un reporte en CSV con la auditoría de todos los votos registrados para verificar anomalías.</p>
            
            <h3 className="text-lg font-bold text-white mt-6 mb-3">Audit Log</h3>
            <div className="h-[150px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {auditLogs.slice(0, 20).map(log => (
                <div key={log.id} className="text-xs p-2 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-blue-400 font-mono">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss') : ''}</span>
                  <span className="text-white ml-2">{log.action}:</span>
                  <span className="text-blue-200/60 ml-1">{log.details}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Candidates & Manual Votes */}
        <div className="mb-16 grid gap-8 lg:grid-cols-3">
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[2rem] glass-panel p-8 lg:col-span-1">
            <h2 className="mb-6 text-2xl font-bold text-white tracking-tight">Agregar Candidato</h2>
            <form onSubmit={handleAddCandidate} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200/80">Nombre Completo</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full rounded-2xl px-5 py-4 glass-input" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200/80">URL Foto (Opcional)</label>
                <input type="url" value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-2xl px-5 py-4 glass-input" />
              </div>
              <button type="submit" disabled={isSubmitting || !newName.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white glass-button-primary disabled:opacity-50 mt-2">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Agregar
              </button>
            </form>
          </motion.section>

          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-[2rem] glass-panel p-8 lg:col-span-2 flex flex-col">
            <h2 className="mb-6 text-2xl font-bold text-white tracking-tight">Gestión de Candidatos</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[400px]">
              {candidates.length === 0 ? <p className="text-blue-200/60 italic">No hay candidatos registrados.</p> : (
                candidates.map((candidate) => (
                  <div key={candidate.id} className={`flex items-center justify-between rounded-2xl border border-white/10 p-5 transition-colors ${candidate.isPaused ? 'bg-red-500/10' : 'bg-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-5">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full font-bold shadow-inner border ${candidate.isPaused ? 'bg-red-500/20 text-red-400 border-red-400/20' : 'bg-blue-500/20 text-blue-400 border-blue-400/20'}`}>
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white tracking-wide">{candidate.name} {candidate.isPaused && <span className="text-xs text-red-400 ml-2">(Pausado)</span>}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTogglePauseCandidate(candidate.id, candidate.name, !!candidate.isPaused)} className="rounded-xl p-3 text-gray-400 transition-all hover:bg-yellow-500/20 hover:text-yellow-400" title={candidate.isPaused ? "Reanudar" : "Pausar"}>
                        {candidate.isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                      </button>
                      <button onClick={() => handleDeleteCandidate(candidate.id, candidate.name)} className="rounded-xl p-3 text-gray-400 transition-all hover:bg-red-500/20 hover:text-red-400" title="Eliminar">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        </div>

        {/* Manual Votes & Recent Votes */}
        <div className="mb-16 grid gap-8 lg:grid-cols-3">
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[2rem] glass-panel p-8 lg:col-span-1">
            <h2 className="mb-6 text-2xl font-bold text-white tracking-tight">Agregar Voto Manual</h2>
            <form onSubmit={handleAddVote} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-blue-200/80">Candidato</label>
                <select value={newVoteCandidateId} onChange={(e) => setNewVoteCandidateId(e.target.value)} className="w-full rounded-2xl px-5 py-4 glass-input appearance-none" required>
                  <option value="" className="bg-slate-900 text-white">Selecciona un candidato</option>
                  {candidates.map((c) => <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isSubmittingVote || !newVoteCandidateId} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white glass-button-primary disabled:opacity-50 mt-2">
                {isSubmittingVote ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Agregar Voto
              </button>
            </form>
          </motion.section>

          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-[2rem] glass-panel p-8 lg:col-span-2 flex flex-col">
            <h2 className="mb-6 text-2xl font-bold text-white tracking-tight">Votos Recientes</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[350px]">
              {votes.length === 0 ? <p className="text-blue-200/60 italic">No hay votos registrados.</p> : (
                votes.slice().sort((a, b) => {
                  const timeA = a.timestamp?.toMillis?.() || (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
                  const timeB = b.timestamp?.toMillis?.() || (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
                  return timeB - timeA;
                }).slice(0, 50).map((vote) => {
                  const candidate = candidates.find(c => c.id === vote.candidateId);
                  return (
                    <div key={vote.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                      <div>
                        <p className="font-bold text-white tracking-wide">{candidate?.name || 'Candidato Desconocido'}</p>
                        <p className="text-sm text-blue-300/80 uppercase tracking-wider font-medium mt-1">
                          {vote.deviceId.startsWith('manual') ? 'Manual' : 'Dispositivo'}
                        </p>
                        <div className="text-xs text-blue-200/50 mt-1 font-mono">
                          {vote.ip && <span>IP: {vote.ip}</span>}
                          {vote.hwid && <span className="ml-2">HWID: {vote.hwid.substring(0, 12)}...</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteVote(vote.id, vote.deviceId)} className="rounded-xl p-3 text-gray-400 transition-all hover:bg-red-500/20 hover:text-red-400" title="Eliminar voto">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.section>
        </div>

        {/* Results Charts */}
        <div className="grid gap-8 lg:grid-cols-1">
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[2rem] glass-panel p-6 sm:p-10">
            <h2 className="mb-8 text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">Resultados Generales</h2>
            
            {(() => {
              const data = getResults();
              if (data.length === 0) return <p className="text-blue-200/60 italic">No hay datos para mostrar.</p>;
              
              const top3 = data.slice(0, 3);
              const titles = ['Delegado', 'Subdelegado', 'Tercer Delegado'];
              const colors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
              const bgColors = ['bg-yellow-500/10 border-yellow-500/20', 'bg-gray-400/10 border-gray-400/20', 'bg-amber-600/10 border-amber-600/20'];

              return (
                <>
                  {/* Podium */}
                  <div className="mb-10 grid gap-4 sm:grid-cols-3">
                    {top3.map((res, idx) => (
                      <div key={idx} className={`rounded-2xl border p-5 text-center ${bgColors[idx] || 'bg-white/5 border-white/10'}`}>
                        <p className={`text-xs font-bold uppercase tracking-widest ${colors[idx] || 'text-blue-400'}`}>
                          {titles[idx] || `Puesto ${idx + 1}`}
                        </p>
                        <p className="mt-2 text-xl font-bold text-white">{res.name}</p>
                        <p className="text-blue-200/60 font-mono mt-1">{res.votos} votos</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                        <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
                          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
