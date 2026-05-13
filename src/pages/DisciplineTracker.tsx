import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuid } from 'uuid';
import {
  Shield,
  Trophy,
  AlertTriangle,
  Flame,
  X,
  Check,
  Wind,
  Heart,
  Sparkles,
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/Input';
import { Heatmap } from '../components/charts/Heatmap';
import { PageContainer } from '../components/layout/PageContainer';
import { db } from '../db/database';
import { today } from '../utils/dates';
import {
  calculateDisciplineStreak,
  calculateBestDisciplineStreak,
} from '../utils/calculations';
import type { DisciplineLog } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMERGENCY_QUOTES = [
  'This urge will pass. It always does.',
  'You are stronger than this moment.',
  "Think about who you're becoming.",
  'Just survive 15 minutes.',
  'Your future self is counting on you right now.',
  'Pain is temporary. Regret lasts forever.',
  "You didn't come this far to only come this far.",
  'The best time to be strong is right now.',
  'Every time you resist, you get stronger.',
  'This is where champions are made.',
];

const EMERGENCY_ACTIONS = [
  'Splash cold water on your face',
  'Go for a walk outside',
  'Do 20 pushups right now',
  'Call someone you trust',
];

const BREATHING_PHASES = [
  { label: 'Breathe in...', duration: 4, scale: 1.6 },
  { label: 'Hold...', duration: 7, scale: 1.6 },
  { label: 'Breathe out...', duration: 8, scale: 1 },
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CelebrationBurst() {
  return (
    <AnimatePresence>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 60;
        const y = Math.sin(angle) * 60;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x, y, scale: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute w-2 h-2 rounded-full bg-green"
            style={{ left: '50%', top: '50%' }}
          />
        );
      })}
    </AnimatePresence>
  );
}

function BreathingCircle() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = BREATHING_PHASES[phaseIndex];

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhaseIndex((prev) => (prev + 1) % BREATHING_PHASES.length);
    }, phase.duration * 1000);
    return () => clearTimeout(timer);
  }, [phaseIndex, phase.duration]);

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        animate={{ scale: phase.scale }}
        transition={{
          duration: phase.duration,
          ease: phase.label === 'Hold...' ? 'linear' : 'easeInOut',
        }}
        className="w-28 h-28 rounded-full border-2 border-red/60 flex items-center justify-center"
        style={{
          background:
            'radial-gradient(circle, rgba(255,45,85,0.15) 0%, rgba(255,45,85,0.03) 100%)',
          boxShadow: '0 0 40px rgba(255,45,85,0.2)',
        }}
      >
        <Wind className="w-8 h-8 text-red/70" />
      </motion.div>
      <motion.p
        key={phase.label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-semibold text-text"
      >
        {phase.label}
      </motion.p>
      <p className="text-xs text-text-3">4-7-8 breathing technique</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function DisciplineTracker() {
  // --- State ----------------------------------------------------------------
  const [showRelapseModal, setShowRelapseModal] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [relapseTrigger, setRelapseTrigger] = useState('');
  const [relapseNotes, setRelapseNotes] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());
  const [emergencyQuote] = useState(
    () => EMERGENCY_QUOTES[Math.floor(Math.random() * EMERGENCY_QUOTES.length)],
  );

  // --- Data -----------------------------------------------------------------
  const logs = useLiveQuery(() => db.disciplineLog.toArray(), []);

  // --- Derived values -------------------------------------------------------
  const currentStreak = useMemo(
    () => (logs ? calculateDisciplineStreak(logs) : 0),
    [logs],
  );

  const bestStreak = useMemo(
    () => (logs ? calculateBestDisciplineStreak(logs) : 0),
    [logs],
  );

  const urgesResisted = useMemo(
    () => (logs ? logs.filter((l) => l.type === 'urge_resisted').length : 0),
    [logs],
  );

  const totalRelapses = useMemo(
    () => (logs ? logs.filter((l) => l.type === 'relapse').length : 0),
    [logs],
  );

  const heatmapData = useMemo(() => {
    if (!logs) return {};
    const data: Record<string, number> = {};
    for (const log of logs) {
      if (log.type === 'urge_resisted') {
        data[log.date] = (data[log.date] || 0) + 1;
      }
    }
    return data;
  }, [logs]);

  const recentUrges = useMemo(() => {
    if (!logs) return [];
    return logs
      .filter((l) => l.type === 'urge_resisted')
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 10);
  }, [logs]);

  // --- Handlers -------------------------------------------------------------
  const handleResistUrge = useCallback(async () => {
    const entry: DisciplineLog = {
      id: uuid(),
      type: 'urge_resisted',
      date: today(),
      time: new Date().toISOString(),
      notes: null,
      trigger: null,
    };
    await db.disciplineLog.add(entry);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 800);
  }, []);

  const handleConfirmRelapse = useCallback(async () => {
    const entry: DisciplineLog = {
      id: uuid(),
      type: 'relapse',
      date: today(),
      time: new Date().toISOString(),
      notes: relapseNotes.trim() || null,
      trigger: relapseTrigger.trim() || null,
    };
    await db.disciplineLog.add(entry);
    setShowRelapseModal(false);
    setRelapseTrigger('');
    setRelapseNotes('');
  }, [relapseNotes, relapseTrigger]);

  const toggleAction = useCallback((index: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const openEmergency = useCallback(() => {
    setCheckedActions(new Set());
    setShowEmergency(true);
  }, []);

  const formatLogTime = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  // --- Loading guard --------------------------------------------------------
  if (!logs) {
    return (
      <PageContainer>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      </PageContainer>
    );
  }

  // --- Render ---------------------------------------------------------------
  return (
    <PageContainer title="Discipline" subtitle="Stay in control">
      <div className="space-y-6">
        {/* ---- Big Counter ------------------------------------------------ */}
        <Card className="flex flex-col items-center py-8">
          <p className="text-xs text-text-3 uppercase tracking-widest mb-2">
            Days since last relapse
          </p>
          <motion.span
            key={currentStreak}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-6xl font-black text-red text-glow-red tabular-nums"
          >
            {currentStreak}
          </motion.span>
          <p className="text-sm text-text-2 mt-2">
            {currentStreak === 0
              ? 'Every journey begins with day one'
              : currentStreak === 1
                ? 'One day down. Keep going.'
                : `${currentStreak} days strong`}
          </p>
        </Card>

        {/* ---- Stats Row -------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="flex flex-col items-center py-3 gap-1.5">
            <Trophy className="h-5 w-5 text-orange" />
            <span className="text-lg font-bold text-text">{bestStreak}</span>
            <span className="text-[10px] text-text-3 uppercase tracking-wide">
              Best Streak
            </span>
          </Card>

          <Card className="flex flex-col items-center py-3 gap-1.5">
            <Shield className="h-5 w-5 text-green" />
            <span className="text-lg font-bold text-text">{urgesResisted}</span>
            <span className="text-[10px] text-text-3 uppercase tracking-wide">
              Resisted
            </span>
          </Card>

          <Card className="flex flex-col items-center py-3 gap-1.5">
            <AlertTriangle className="h-5 w-5 text-text-2" />
            <span className="text-lg font-bold text-text">{totalRelapses}</span>
            <span className="text-[10px] text-text-3 uppercase tracking-wide">
              Relapses
            </span>
          </Card>
        </div>

        {/* ---- Action Buttons --------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 relative">
          <div className="relative flex items-center justify-center">
            <Button
              fullWidth
              size="lg"
              className="!bg-green/10 !text-green border border-green/30 hover:!bg-green/20"
              onClick={handleResistUrge}
              aria-label="Log that you resisted an urge"
            >
              <Shield className="h-4 w-4" />
              I Resisted
            </Button>
            <AnimatePresence>
              {showCelebration && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <CelebrationBurst />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            fullWidth
            size="lg"
            variant="danger"
            onClick={() => setShowRelapseModal(true)}
            aria-label="Log a relapse"
          >
            <AlertTriangle className="h-4 w-4" />
            Log Relapse
          </Button>
        </div>

        {/* ---- Emergency Mode Card ---------------------------------------- */}
        <Card
          onClick={openEmergency}
          glow="red"
          className="flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-red/10 flex items-center justify-center shrink-0">
            <Heart className="h-6 w-6 text-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">Emergency Mode</p>
            <p className="text-xs text-text-3 mt-0.5">
              Feeling an urge? Tap for breathing exercise and support.
            </p>
          </div>
          <Flame className="h-5 w-5 text-red/50 shrink-0" />
        </Card>

        {/* ---- 91-day Heatmap --------------------------------------------- */}
        <section>
          <h2 className="text-base font-semibold text-text mb-3">
            Urge Resistance Heatmap
          </h2>
          <Card>
            <Heatmap data={heatmapData} days={91} color="#30D158" />
          </Card>
        </section>

        {/* ---- Recent Urge Resistance Log --------------------------------- */}
        {recentUrges.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-text mb-3">
              Recent Victories
            </h2>
            <div className="space-y-2">
              {recentUrges.map((log) => (
                <Card key={log.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-green/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text">Resisted an urge</p>
                    <p className="text-[11px] text-text-3">{formatLogTime(log.time)}</p>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-green/10 text-green">
                    Won
                  </span>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ==== Relapse Confirmation Modal ==================================== */}
      <Modal
        open={showRelapseModal}
        onClose={() => setShowRelapseModal(false)}
        title="Log a Relapse"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-2">
            It is okay. What matters is that you are here and being honest with
            yourself. Every reset is a chance to grow stronger.
          </p>

          <Input
            label="Trigger (optional)"
            placeholder="What triggered the relapse?"
            value={relapseTrigger}
            onChange={(e) => setRelapseTrigger(e.target.value)}
          />

          <TextArea
            label="Notes (optional)"
            placeholder="Any reflections or thoughts..."
            rows={3}
            value={relapseNotes}
            onChange={(e) => setRelapseNotes(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setShowRelapseModal(false)}
            >
              Cancel
            </Button>
            <Button fullWidth variant="danger" onClick={handleConfirmRelapse}>
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==== Emergency Mode Full-Screen Overlay ============================ */}
      <AnimatePresence>
        {showEmergency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,45,85,0.08) 0%, rgba(0,0,0,0.97) 70%)',
            }}
          >
            {/* Close button */}
            <div className="flex justify-end p-4 sticky top-0 z-10">
              <button
                onClick={() => setShowEmergency(false)}
                className="p-2 rounded-full bg-surface-2/50 text-text-2 hover:bg-surface-2 transition-colors"
                aria-label="Close emergency mode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center px-6 pb-12 gap-10">
              {/* Breathing animation */}
              <BreathingCircle />

              {/* Motivational quote */}
              <div className="max-w-sm text-center">
                <Sparkles className="h-4 w-4 text-red/50 mx-auto mb-2" />
                <p className="text-sm text-text-2 italic leading-relaxed">
                  &ldquo;{emergencyQuote}&rdquo;
                </p>
              </div>

              {/* Emergency action checklist */}
              <div className="w-full max-w-sm space-y-3">
                <h3 className="text-xs text-text-3 uppercase tracking-widest text-center mb-4">
                  Emergency Actions
                </h3>
                {EMERGENCY_ACTIONS.map((action, index) => {
                  const checked = checkedActions.has(index);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleAction(index)}
                      className="w-full flex items-center gap-3 bg-surface/60 rounded-xl px-4 py-3 border border-border/50 transition-all active:scale-[0.98]"
                      aria-label={`${checked ? 'Uncheck' : 'Check'}: ${action}`}
                    >
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-green border-green'
                            : 'border-text-3 bg-transparent'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 text-bg" />}
                      </div>
                      <span
                        className={`text-sm text-left transition-colors ${
                          checked ? 'text-text-3 line-through' : 'text-text'
                        }`}
                      >
                        {action}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Resist button in emergency */}
              <Button
                size="lg"
                className="!bg-green !text-bg font-semibold glow-green"
                onClick={() => {
                  handleResistUrge();
                  setShowEmergency(false);
                }}
              >
                <Shield className="h-5 w-5" />
                I Made It Through
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
