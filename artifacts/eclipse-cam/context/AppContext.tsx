import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FocusMode = 'infinity' | 'near-infinity' | 'hyperfocal';
export type AppMode = 'eclipse' | 'moon';
export type SimSpeed = 1 | 60 | 300;

export interface ExposureStep {
  id: string;
  name: string;
  iso: number;
  shutterSpeed: string; // e.g. '1/1000', '2s'
  aperture: string;     // e.g. 'f/8'
  shotCount: number;
  intervalMs: number;   // delay between shots in this step (ms)
  focusMode: FocusMode;
  notes?: string;
}

export interface Sequence {
  id: string;
  name: string;
  mode: AppMode;
  description: string;
  steps: ExposureStep[];
  createdAt: number;
  isDefault?: boolean;
}

export interface CapturedShot {
  id: string;
  stepName: string;
  iso: number;
  shutterSpeed: string;
  aperture: string;
  focusMode: FocusMode;
  timestamp: number;
}

export interface Session {
  id: string;
  sequenceId: string;
  sequenceName: string;
  mode: AppMode;
  startedAt: number;
  completedAt?: number;
  shots: CapturedShot[];
  status: 'running' | 'completed' | 'cancelled';
  totalSteps: number;
  completedSteps: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const ECLIPSE_SEQ: Sequence = {
  id: 'default-eclipse-totality',
  name: 'Éclipse Totale',
  mode: 'eclipse',
  description:
    'Séquence complète du 1er au 4e contact — phases partielles, totalité et perles de Baily',
  isDefault: true,
  createdAt: 0,
  steps: [
    {
      id: 'e1', name: '1er Contact (C1)',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 3, intervalMs: 120000,
      focusMode: 'infinity',
      notes: 'Début phase partielle — filtre solaire requis',
    },
    {
      id: 'e2', name: 'Phase partielle 25%',
      iso: 100, shutterSpeed: '1/750', aperture: 'f/8',
      shotCount: 3, intervalMs: 180000,
      focusMode: 'infinity',
    },
    {
      id: 'e3', name: 'Phase partielle 50%',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 3, intervalMs: 180000,
      focusMode: 'infinity',
    },
    {
      id: 'e4', name: 'Phase partielle 75%',
      iso: 100, shutterSpeed: '1/250', aperture: 'f/8',
      shotCount: 3, intervalMs: 120000,
      focusMode: 'infinity',
    },
    {
      id: 'e5', name: 'Phase partielle 90%',
      iso: 100, shutterSpeed: '1/125', aperture: 'f/8',
      shotCount: 3, intervalMs: 60000,
      focusMode: 'near-infinity',
    },
    {
      id: 'e6', name: 'Perles de Baily',
      iso: 100, shutterSpeed: '1/2000', aperture: 'f/8',
      shotCount: 10, intervalMs: 2000,
      focusMode: 'near-infinity',
      notes: '⚠️ Retirer le filtre solaire maintenant !',
    },
    {
      id: 'e7', name: 'Anneau de Diamant',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 10, intervalMs: 1500,
      focusMode: 'near-infinity',
    },
    {
      id: 'e8', name: 'Totalité — Couronne large',
      iso: 400, shutterSpeed: '1/250', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 5000,
      focusMode: 'infinity',
    },
    {
      id: 'e9', name: 'Totalité — Protubérances',
      iso: 400, shutterSpeed: '1/1000', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 4000,
      focusMode: 'near-infinity',
    },
    {
      id: 'e10', name: 'Couronne étendue',
      iso: 800, shutterSpeed: '1/30', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 8000,
      focusMode: 'infinity',
    },
    {
      id: 'e11', name: 'Lumière cendrée',
      iso: 3200, shutterSpeed: '2s', aperture: 'f/4',
      shotCount: 3, intervalMs: 15000,
      focusMode: 'hyperfocal',
      notes: 'Trépied essentiel — mise au point hyperfocale',
    },
    {
      id: 'e12', name: '2e Anneau de Diamant',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 10, intervalMs: 1500,
      focusMode: 'near-infinity',
      notes: 'Fin de totalité',
    },
    {
      id: 'e13', name: '2es Perles de Baily',
      iso: 100, shutterSpeed: '1/2000', aperture: 'f/8',
      shotCount: 8, intervalMs: 2000,
      focusMode: 'near-infinity',
      notes: '⚠️ Remettre le filtre solaire !',
    },
    {
      id: 'e14', name: '3e Contact (C3)',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 3, intervalMs: 120000,
      focusMode: 'infinity',
    },
    {
      id: 'e15', name: '4e Contact (C4)',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 3, intervalMs: 60000,
      focusMode: 'infinity',
      notes: 'Fin de l\'éclipse',
    },
  ],
};

const MOON_SEQ: Sequence = {
  id: 'default-moon-training',
  name: 'Entraînement Lunaire',
  mode: 'moon',
  description:
    'Entraînement nocturne sur la pleine lune — pratique idéale avant l\'éclipse',
  isDefault: true,
  createdAt: 0,
  steps: [
    {
      id: 'm1', name: 'Référence pleine lune',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 5, intervalMs: 10000,
      focusMode: 'infinity',
    },
    {
      id: 'm2', name: 'Terminateur (détails)',
      iso: 200, shutterSpeed: '1/250', aperture: 'f/8',
      shotCount: 5, intervalMs: 12000,
      focusMode: 'near-infinity',
      notes: 'Contraste maximal au terminateur',
    },
    {
      id: 'm3', name: 'Bords lunaires',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 5, intervalMs: 10000,
      focusMode: 'infinity',
    },
    {
      id: 'm4', name: 'Hautes ISO (sim. totalité)',
      iso: 1600, shutterSpeed: '1/2000', aperture: 'f/5.6',
      shotCount: 5, intervalMs: 10000,
      focusMode: 'near-infinity',
      notes: 'Simule les conditions de la totalité',
    },
    {
      id: 'm5', name: 'Bracketing −1 EV',
      iso: 100, shutterSpeed: '1/1000', aperture: 'f/8',
      shotCount: 3, intervalMs: 8000,
      focusMode: 'infinity',
    },
    {
      id: 'm6', name: 'Bracketing 0 EV',
      iso: 100, shutterSpeed: '1/500', aperture: 'f/8',
      shotCount: 3, intervalMs: 8000,
      focusMode: 'infinity',
    },
    {
      id: 'm7', name: 'Bracketing +1 EV',
      iso: 100, shutterSpeed: '1/250', aperture: 'f/8',
      shotCount: 3, intervalMs: 8000,
      focusMode: 'infinity',
    },
    {
      id: 'm8', name: 'Pose longue — cratères',
      iso: 200, shutterSpeed: '1/60', aperture: 'f/8',
      shotCount: 5, intervalMs: 20000,
      focusMode: 'near-infinity',
    },
    {
      id: 'm9', name: 'Hyperfocale test',
      iso: 400, shutterSpeed: '1/30', aperture: 'f/4',
      shotCount: 3, intervalMs: 15000,
      focusMode: 'hyperfocal',
      notes: 'Trépied requis',
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTotalShots(seq: Sequence) {
  return seq.steps.reduce((acc, s) => acc + s.shotCount, 0);
}

export function getTotalTimeMs(seq: Sequence) {
  return seq.steps.reduce((acc, s) => acc + s.shotCount * s.intervalMs, 0);
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s > 0 ? s + 's' : ''}`.trim();
  return `${s}s`;
}

export const FOCUS_LABELS: Record<FocusMode, string> = {
  infinity: '∞ Infini',
  'near-infinity': '∞− Quasi-infini',
  hyperfocal: '⊕ Hyperfocale',
};

export const FOCUS_DESCRIPTIONS: Record<FocusMode, string> = {
  infinity: 'Mise au point à l\'infini — étoiles, soleil, lune',
  'near-infinity': 'Légèrement en deçà de l\'infini — optimisé corona / protubérances',
  hyperfocal: 'Distance hyperfocale — profondeur de champ maximale',
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextType {
  sequences: Sequence[];
  sessions: Session[];
  selectedSequenceId: string | null;
  activeMode: AppMode;
  simulationSpeed: SimSpeed;
  selectedSequence: Sequence | null;
  setSelectedSequenceId: (id: string | null) => void;
  setActiveMode: (mode: AppMode) => void;
  setSimulationSpeed: (speed: SimSpeed) => void;
  addSequence: (seq: Omit<Sequence, 'id' | 'createdAt'>) => string;
  updateSequence: (id: string, updates: Partial<Sequence>) => void;
  deleteSequence: (id: string) => void;
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const KEYS = {
  sequences: '@eclipse_sequences_v2',
  sessions: '@eclipse_sessions_v2',
  selectedId: '@eclipse_selected_v2',
  mode: '@eclipse_mode_v2',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sequences, setSequences] = useState<Sequence[]>([ECLIPSE_SEQ, MOON_SEQ]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSequenceId, _setSelectedSequenceId] = useState<string | null>(
    'default-eclipse-totality',
  );
  const [activeMode, _setActiveMode] = useState<AppMode>('eclipse');
  const [simulationSpeed, setSimulationSpeed] = useState<SimSpeed>(1);
  const [loaded, setLoaded] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const [seqRaw, sesRaw, selRaw, modeRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.sequences),
          AsyncStorage.getItem(KEYS.sessions),
          AsyncStorage.getItem(KEYS.selectedId),
          AsyncStorage.getItem(KEYS.mode),
        ]);
        if (seqRaw) {
          const custom = (JSON.parse(seqRaw) as Sequence[]).filter(s => !s.isDefault);
          setSequences([ECLIPSE_SEQ, MOON_SEQ, ...custom]);
        }
        if (sesRaw) setSessions(JSON.parse(sesRaw));
        if (selRaw) _setSelectedSequenceId(selRaw);
        if (modeRaw) _setActiveMode(modeRaw as AppMode);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // Persist
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEYS.sequences, JSON.stringify(sequences));
  }, [sequences, loaded]);
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions.slice(0, 200)));
  }, [sessions, loaded]);
  useEffect(() => {
    if (!loaded) return;
    if (selectedSequenceId) AsyncStorage.setItem(KEYS.selectedId, selectedSequenceId);
  }, [selectedSequenceId, loaded]);
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEYS.mode, activeMode);
  }, [activeMode, loaded]);

  const setSelectedSequenceId = useCallback((id: string | null) => {
    _setSelectedSequenceId(id);
  }, []);

  const setActiveMode = useCallback((mode: AppMode) => {
    _setActiveMode(mode);
  }, []);

  // Auto-select first sequence when mode changes
  useEffect(() => {
    if (!loaded) return;
    setSequences(prev => {
      const current = prev.find(s => s.id === selectedSequenceId);
      if (!current || current.mode !== activeMode) {
        const first = prev.find(s => s.mode === activeMode);
        if (first) _setSelectedSequenceId(first.id);
      }
      return prev;
    });
  }, [activeMode, loaded]);

  const addSequence = useCallback((seq: Omit<Sequence, 'id' | 'createdAt'>): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newSeq: Sequence = { ...seq, id, createdAt: Date.now() };
    setSequences(prev => [...prev, newSeq]);
    _setSelectedSequenceId(id);
    return id;
  }, []);

  const updateSequence = useCallback((id: string, updates: Partial<Sequence>) => {
    setSequences(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteSequence = useCallback((id: string) => {
    setSequences(prev => prev.filter(s => s.id !== id));
    _setSelectedSequenceId(curr => (curr === id ? null : curr));
  }, []);

  const addSession = useCallback((session: Session) => {
    setSessions(prev => [session, ...prev]);
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const selectedSequence =
    sequences.find(s => s.id === selectedSequenceId) ?? null;

  return (
    <AppContext.Provider
      value={{
        sequences,
        sessions,
        selectedSequenceId,
        activeMode,
        simulationSpeed,
        selectedSequence,
        setSelectedSequenceId,
        setActiveMode,
        setSimulationSpeed,
        addSequence,
        updateSequence,
        deleteSequence,
        addSession,
        updateSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
