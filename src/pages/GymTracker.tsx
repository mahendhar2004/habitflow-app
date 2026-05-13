import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import {
  Dumbbell, Plus, Timer, Check, Trophy, ChevronDown, Search, X, Play, Square, Scale, Ruler,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

import { PageContainer } from '../components/layout/PageContainer';
import { db } from '../db/database';
import { today, formatShortDate } from '../utils/dates';
import { calculateTotalVolume, getPersonalRecord } from '../utils/calculations';
import { WORKOUT_TEMPLATES } from '../db/seed';
import type { Workout, ExerciseSet, ExerciseLibraryItem, BodyStat } from '../types';

// ---------------------------------------------------------------------------
// Types for in-progress workout state (not yet persisted)
// ---------------------------------------------------------------------------

interface ActiveSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  confirmed: boolean;
}

interface ActiveExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: ActiveSet[];
}

interface ActiveWorkout {
  id: string;
  templateName: string | null;
  startTime: Date;
  exercises: ActiveExercise[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function groupByMuscle(items: ExerciseLibraryItem[]): Record<string, ExerciseLibraryItem[]> {
  const groups: Record<string, ExerciseLibraryItem[]> = {};
  for (const item of items) {
    if (!groups[item.muscleGroup]) groups[item.muscleGroup] = [];
    groups[item.muscleGroup].push(item);
  }
  return groups;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RestTimerOverlay({ onSkip }: { onSkip: () => void }) {
  const TOTAL = 90;
  const [remaining, setRemaining] = useState(TOTAL);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onSkip]);

  const progress = (TOTAL - remaining) / TOTAL;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onSkip}
      role="button"
      aria-label="Tap to skip rest timer"
    >
      <p className="text-text-2 text-sm mb-4 uppercase tracking-wider font-medium">Rest Timer</p>
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#2C2C2E" strokeWidth="6" />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="#FF2D55"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="text-3xl font-bold text-text tabular-nums">{formatElapsed(remaining)}</span>
      </div>
      <p className="text-text-3 text-xs mt-6">Tap anywhere to skip</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GymTracker() {
  // Active workout state
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modals
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showBodyStatModal, setShowBodyStatModal] = useState(false);

  // Body stat form
  const [bsWeight, setBsWeight] = useState('');
  const [bsChest, setBsChest] = useState('');
  const [bsArms, setBsArms] = useState('');
  const [bsWaist, setBsWaist] = useState('');
  const [bsBodyFat, setBsBodyFat] = useState('');

  // Queries
  const exerciseLibrary = useLiveQuery(() => db.exerciseLibrary.toArray(), []) ?? [];
  const allSets = useLiveQuery(() => db.exerciseSets.toArray(), []) ?? [];
  const recentWorkouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().limit(5).toArray(),
    [],
  ) ?? [];
  const recentWorkoutSets = useLiveQuery(async () => {
    const ids = recentWorkouts.map((w) => w.id);
    if (ids.length === 0) return [];
    return db.exerciseSets.where('workoutId').anyOf(ids).toArray();
  }, [recentWorkouts]) ?? [];
  const latestBodyStat = useLiveQuery(
    () => db.bodyStats.orderBy('date').reverse().first(),
    [],
  );

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (activeWorkout) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeWorkout.startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWorkout]);

  // ---------------------------------------------------------------------------
  // Workout actions
  // ---------------------------------------------------------------------------

  function startWorkout(templateName: string | null, exerciseNames: string[]) {
    const exercises: ActiveExercise[] = exerciseNames.map((name) => {
      const lib = exerciseLibrary.find((e) => e.name === name);
      return {
        id: uuid(),
        name,
        muscleGroup: lib?.muscleGroup ?? 'full_body',
        sets: [{ id: uuid(), setNumber: 1, weight: 0, reps: 0, confirmed: false }],
      };
    });

    setActiveWorkout({
      id: uuid(),
      templateName,
      startTime: new Date(),
      exercises,
    });
    setElapsed(0);
  }

  function addExercise(item: ExerciseLibraryItem) {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: [
        ...activeWorkout.exercises,
        {
          id: uuid(),
          name: item.name,
          muscleGroup: item.muscleGroup,
          sets: [{ id: uuid(), setNumber: 1, weight: 0, reps: 0, confirmed: false }],
        },
      ],
    });
    setShowExerciseModal(false);
    setExerciseSearch('');
  }

  function addSet(exerciseId: string) {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: uuid(),
              setNumber: ex.sets.length + 1,
              weight: lastSet?.weight ?? 0,
              reps: lastSet?.reps ?? 0,
              confirmed: false,
            },
          ],
        };
      }),
    });
  }

  function updateSet(exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
        };
      }),
    });
  }

  const skipRestTimer = useCallback(() => setShowRestTimer(false), []);

  function confirmSet(exerciseId: string, setId: string) {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, confirmed: true } : s)),
        };
      }),
    });
    setShowRestTimer(true);
  }

  function removeExercise(exerciseId: string) {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.filter((ex) => ex.id !== exerciseId),
    });
  }

  async function finishWorkout() {
    if (!activeWorkout) return;

    const workout: Workout = {
      id: activeWorkout.id,
      date: today(),
      templateName: activeWorkout.templateName,
      startTime: activeWorkout.startTime.toISOString(),
      endTime: new Date().toISOString(),
      notes: null,
    };

    const sets: ExerciseSet[] = [];
    for (const ex of activeWorkout.exercises) {
      for (const s of ex.sets) {
        if (!s.confirmed) continue;
        const pr = getPersonalRecord(allSets, ex.name);
        const isPR = pr ? s.weight > pr.weight || (s.weight === pr.weight && s.reps > pr.reps) : s.weight > 0;

        sets.push({
          id: s.id,
          workoutId: activeWorkout.id,
          exerciseName: ex.name,
          muscleGroup: ex.muscleGroup,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          isPersonalRecord: isPR,
        });
      }
    }

    await db.workouts.add(workout);
    if (sets.length > 0) {
      await db.exerciseSets.bulkAdd(sets);
    }

    setActiveWorkout(null);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // ---------------------------------------------------------------------------
  // Body stats
  // ---------------------------------------------------------------------------

  async function saveBodyStat() {
    const stat: BodyStat = {
      id: uuid(),
      date: today(),
      weight: bsWeight ? Number(bsWeight) : null,
      chest: bsChest ? Number(bsChest) : null,
      arms: bsArms ? Number(bsArms) : null,
      waist: bsWaist ? Number(bsWaist) : null,
      bodyFat: bsBodyFat ? Number(bsBodyFat) : null,
    };
    await db.bodyStats.add(stat);
    setShowBodyStatModal(false);
    setBsWeight('');
    setBsChest('');
    setBsArms('');
    setBsWaist('');
    setBsBodyFat('');
  }

  // ---------------------------------------------------------------------------
  // Exercise modal helpers
  // ---------------------------------------------------------------------------

  const filteredLibrary = useMemo(() => {
    if (!exerciseSearch.trim()) return exerciseLibrary;
    const q = exerciseSearch.toLowerCase();
    return exerciseLibrary.filter(
      (e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q),
    );
  }, [exerciseLibrary, exerciseSearch]);

  const grouped = useMemo(() => groupByMuscle(filteredLibrary), [filteredLibrary]);

  // Check if a set is a PR relative to previous history
  function isPR(exerciseName: string, weight: number, reps: number): boolean {
    if (weight === 0) return false;
    const pr = getPersonalRecord(allSets, exerciseName);
    if (!pr) return true;
    return weight > pr.weight || (weight === pr.weight && reps > pr.reps);
  }

  // ---------------------------------------------------------------------------
  // Render: Active Workout
  // ---------------------------------------------------------------------------

  if (activeWorkout) {
    return (
      <PageContainer>
        <AnimatePresence>
          {showRestTimer && <RestTimerOverlay onSkip={skipRestTimer} />}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">
              {activeWorkout.templateName ?? 'Freestyle Workout'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Timer size={14} className="text-red" />
              <span className="text-sm font-mono text-red tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={finishWorkout}>
            <Square size={14} />
            Finish
          </Button>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {activeWorkout.exercises.map((ex) => (
            <Card key={ex.id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Dumbbell size={16} className="text-orange" />
                  <span className="font-semibold text-text text-sm">{ex.name}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-surface-2 text-text-3 px-2 py-0.5 rounded-full">
                    {capitalise(ex.muscleGroup)}
                  </span>
                </div>
                <button
                  onClick={() => removeExercise(ex.id)}
                  className="p-1 rounded-full hover:bg-surface-2 text-text-3"
                  aria-label={`Remove ${ex.name}`}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Set header */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 mb-1 px-1">
                <span className="text-[10px] text-text-3 uppercase font-medium">Set</span>
                <span className="text-[10px] text-text-3 uppercase font-medium">Kg</span>
                <span className="text-[10px] text-text-3 uppercase font-medium">Reps</span>
                <span />
              </div>

              {/* Set rows */}
              {ex.sets.map((s) => {
                const prHit = s.confirmed && isPR(ex.name, s.weight, s.reps);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center mb-2 px-1 py-1 rounded-lg ${
                      s.confirmed ? 'bg-green/10' : ''
                    }`}
                  >
                    <span className="text-xs text-text-2 font-medium text-center">{s.setNumber}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={s.weight || ''}
                      onChange={(e) => updateSet(ex.id, s.id, 'weight', Number(e.target.value))}
                      disabled={s.confirmed}
                      placeholder="0"
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text text-center tabular-nums focus:outline-none focus:border-red/50 disabled:opacity-50"
                      aria-label={`Weight for set ${s.setNumber}`}
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={s.reps || ''}
                      onChange={(e) => updateSet(ex.id, s.id, 'reps', Number(e.target.value))}
                      disabled={s.confirmed}
                      placeholder="0"
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text text-center tabular-nums focus:outline-none focus:border-red/50 disabled:opacity-50"
                      aria-label={`Reps for set ${s.setNumber}`}
                    />
                    <div className="flex items-center justify-center">
                      {s.confirmed ? (
                        prHit ? (
                          <Trophy size={16} className="text-orange" />
                        ) : (
                          <Check size={16} className="text-green" />
                        )
                      ) : (
                        <button
                          onClick={() => confirmSet(ex.id, s.id)}
                          disabled={s.weight === 0 && s.reps === 0}
                          className="p-1.5 rounded-lg bg-green/20 text-green hover:bg-green/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Confirm set ${s.setNumber}`}
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Add set */}
              <button
                onClick={() => addSet(ex.id)}
                className="flex items-center gap-1.5 text-xs text-red font-medium mt-2 px-1 py-1 hover:bg-surface-2 rounded-lg transition-colors"
                aria-label={`Add set to ${ex.name}`}
              >
                <Plus size={12} />
                Add Set
              </button>
            </Card>
          ))}
        </div>

        {/* Add exercise button */}
        <div className="mt-4">
          <Button variant="secondary" fullWidth onClick={() => setShowExerciseModal(true)}>
            <Plus size={16} />
            Add Exercise
          </Button>
        </div>

        {/* Exercise selection modal */}
        <Modal open={showExerciseModal} onClose={() => { setShowExerciseModal(false); setExerciseSearch(''); }} title="Add Exercise">
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-red/50"
                aria-label="Search exercises"
              />
            </div>
          </div>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, items]) => (
              <div key={group}>
                <h4 className="text-[10px] uppercase tracking-wider font-semibold text-text-3 mb-2 px-1">
                  {capitalise(group)}
                </h4>
                <div className="space-y-1">
                  {items.map((item) => {
                    const alreadyAdded = activeWorkout.exercises.some((e) => e.name === item.name);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addExercise(item)}
                        disabled={alreadyAdded}
                        className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                          alreadyAdded
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-surface-2 active:bg-surface-3'
                        }`}
                        aria-label={`Add ${item.name}`}
                      >
                        <span className="text-sm text-text">{item.name}</span>
                        {alreadyAdded ? (
                          <Check size={14} className="text-green" />
                        ) : (
                          <Plus size={14} className="text-text-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <p className="text-sm text-text-3 text-center py-8">No exercises found</p>
            )}
          </div>
        </Modal>
      </PageContainer>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Start Workout (no active workout)
  // ---------------------------------------------------------------------------

  return (
    <PageContainer title="Start Workout" subtitle="Pick a template or go freestyle">
      {/* Template grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {WORKOUT_TEMPLATES.map((template) => (
          <Card
            key={template.name}
            onClick={() => startWorkout(template.name, template.exercises)}
          >
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center">
                <Dumbbell size={18} className="text-red" />
              </div>
              <span className="text-sm font-semibold text-text">{template.name}</span>
              <span className="text-[10px] text-text-3">
                {template.exercises.length} exercises
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Freestyle */}
      <Button variant="secondary" fullWidth onClick={() => startWorkout(null, [])}>
        <Play size={16} />
        Freestyle Workout
      </Button>

      {/* Recent workouts */}
      {recentWorkouts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-text-2 uppercase tracking-wider mb-3">
            Recent Workouts
          </h2>
          <div className="space-y-2">
            {recentWorkouts.map((w) => {
              const wSets = recentWorkoutSets.filter((s) => s.workoutId === w.id);
              const exerciseCount = new Set(wSets.map((s) => s.exerciseName)).size;
              const volume = calculateTotalVolume(wSets);
              return (
                <Card key={w.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {w.templateName ?? 'Freestyle'}
                      </p>
                      <p className="text-xs text-text-3 mt-0.5">
                        {formatShortDate(w.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-2">
                        {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-text-3 mt-0.5">
                        {volume.toLocaleString()} kg vol.
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Body Stats */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-2 uppercase tracking-wider">
            Body Stats
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowBodyStatModal(true)}>
            <Scale size={14} />
            Log Stats
          </Button>
        </div>

        {latestBodyStat ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[
              { label: 'Weight', value: latestBodyStat.weight, unit: 'kg', icon: Scale },
              { label: 'Chest', value: latestBodyStat.chest, unit: 'cm', icon: Ruler },
              { label: 'Arms', value: latestBodyStat.arms, unit: 'cm', icon: Ruler },
              { label: 'Waist', value: latestBodyStat.waist, unit: 'cm', icon: Ruler },
              { label: 'Body Fat', value: latestBodyStat.bodyFat, unit: '%', icon: ChevronDown },
            ].map((item) => (
              <Card key={item.label}>
                <div className="text-center">
                  <item.icon size={14} className="text-orange mx-auto mb-1" />
                  <p className="text-xs text-text-3">{item.label}</p>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {item.value !== null && item.value !== undefined ? `${item.value}${item.unit}` : '--'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-text-3 text-center py-4">
              No stats logged yet. Tap "Log Stats" to record your measurements.
            </p>
          </Card>
        )}
      </div>

      {/* Body Stat Modal */}
      <Modal open={showBodyStatModal} onClose={() => setShowBodyStatModal(false)} title="Log Body Stats">
        <div className="space-y-3">
          <Input
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 75"
            value={bsWeight}
            onChange={(e) => setBsWeight(e.target.value)}
          />
          <Input
            label="Chest (cm)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 100"
            value={bsChest}
            onChange={(e) => setBsChest(e.target.value)}
          />
          <Input
            label="Arms (cm)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 38"
            value={bsArms}
            onChange={(e) => setBsArms(e.target.value)}
          />
          <Input
            label="Waist (cm)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 82"
            value={bsWaist}
            onChange={(e) => setBsWaist(e.target.value)}
          />
          <Input
            label="Body Fat (%)"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 15"
            value={bsBodyFat}
            onChange={(e) => setBsBodyFat(e.target.value)}
          />
          <div className="pt-2">
            <Button variant="primary" fullWidth onClick={saveBodyStat}>
              Save Stats
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
