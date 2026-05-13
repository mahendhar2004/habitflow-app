import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { v4 as uuid } from 'uuid';
import {
  Check,
  Circle,
  Droplets,
  Moon,
  Heart,
  Dumbbell,
  Flame,
  Quote,
  ChevronRight,

  Brain,
  MessageCircle,
  Shield,
  Zap,
  Target,
  Sparkles,
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ActivityRings } from '../components/charts/ActivityRings';
import { PageContainer } from '../components/layout/PageContainer';
import { db } from '../db/database';
import { today, getGreeting, formatDate } from '../utils/dates';
import { calculateStreak, calculateDisciplineStreak } from '../utils/calculations';
import { MOTIVATIONAL_QUOTES } from '../db/seed';
import type { HabitCategory } from '../types';

// ---------------------------------------------------------------------------
// Category -> Lucide icon mapping
// ---------------------------------------------------------------------------
const CATEGORY_ICONS: Record<HabitCategory, React.FC<React.SVGProps<SVGSVGElement>>> = {
  health: Heart,
  career: Target,
  mind: Brain,
  discipline: Shield,
  communication: MessageCircle,
  custom: Sparkles,
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const listContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function Dashboard() {
  const navigate = useNavigate();
  const todayStr = today();

  // --- Data queries (all reactive via useLiveQuery) -----------------------
  const habits = useLiveQuery(() => db.habits.orderBy('sortOrder').toArray(), []);
  const completions = useLiveQuery(() => db.completions.toArray(), []);
  const todayCompletions = useLiveQuery(
    () => db.completions.where('date').equals(todayStr).toArray(),
    [todayStr],
  );
  const waterLog = useLiveQuery(
    () => db.waterLog.where('date').equals(todayStr).first(),
    [todayStr],
  );
  const sleepLog = useLiveQuery(
    () => db.sleepLog.where('date').equals(todayStr).first(),
    [todayStr],
  );
  const moodLog = useLiveQuery(
    () => db.moodLog.where('date').equals(todayStr).first(),
    [todayStr],
  );
  const disciplineLogs = useLiveQuery(() => db.disciplineLog.toArray(), []);

  // --- Derived values -----------------------------------------------------
  const completedIds = useMemo(
    () => new Set((todayCompletions ?? []).map((c) => c.habitId)),
    [todayCompletions],
  );

  const habitsCount = habits?.length ?? 0;
  const completedCount = completedIds.size;
  const habitProgress = habitsCount > 0 ? Math.round((completedCount / habitsCount) * 100) : 0;

  const bestStreak = useMemo(() => {
    if (!habits || !completions) return 0;
    let max = 0;
    for (const h of habits) {
      const s = calculateStreak(completions, h.id);
      if (s > max) max = s;
    }
    return max;
  }, [habits, completions]);

  const disciplineStreak = useMemo(
    () => (disciplineLogs ? calculateDisciplineStreak(disciplineLogs) : 0),
    [disciplineLogs],
  );

  // Rings data
  const rings = useMemo(
    () => [
      {
        progress: habitProgress,
        color: '#FF2D55',
        glowColor: 'rgba(255,45,85,0.5)',
        label: 'Habits',
        value: `${completedCount}/${habitsCount}`,
      },
      {
        progress: Math.min(bestStreak * 10, 100),
        color: '#FF9500',
        glowColor: 'rgba(255,149,0,0.5)',
        label: 'Best Streak',
        value: `${bestStreak}d`,
      },
      {
        progress: Math.min(disciplineStreak * 5, 100),
        color: '#30D158',
        glowColor: 'rgba(48,209,88,0.5)',
        label: 'Discipline',
        value: `${disciplineStreak}d`,
      },
    ],
    [habitProgress, completedCount, habitsCount, bestStreak, disciplineStreak],
  );

  // Daily quote (deterministic by day-of-year)
  const quote = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, []);

  // Mood label helper
  const moodLabel = (mood: number): string => {
    const labels: Record<number, string> = { 1: 'Bad', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };
    return labels[mood] ?? '--';
  };

  // --- Handlers -----------------------------------------------------------
  const toggleCompletion = useCallback(
    async (habitId: string) => {
      if (!todayCompletions) return;
      const existing = todayCompletions.find((c) => c.habitId === habitId);
      if (existing) {
        await db.completions.delete(existing.id);
      } else {
        await db.completions.add({
          id: uuid(),
          habitId,
          date: todayStr,
          completedAt: new Date().toISOString(),
          notes: null,
        });
      }
    },
    [todayCompletions, todayStr],
  );

  // --- Loading guard ------------------------------------------------------
  if (!habits || !todayCompletions) {
    return (
      <PageContainer>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      </PageContainer>
    );
  }

  // --- Render -------------------------------------------------------------
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* ---- Greeting -------------------------------------------------- */}
        <div>
          <h1 className="text-2xl font-bold text-text">{getGreeting()}</h1>
          <p className="text-sm text-text-2 mt-0.5">{formatDate(todayStr)}</p>
        </div>

        {/* ---- Activity Rings + Legend ----------------------------------- */}
        <Card className="flex items-center gap-6">
          <ActivityRings rings={rings} size={140} />
          <div className="flex-1 space-y-2.5">
            {rings.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color, boxShadow: `0 0 6px ${r.glowColor}` }}
                />
                <span className="text-xs text-text-2 flex-1">{r.label}</span>
                <span className="text-sm font-semibold text-text">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ---- Today's Habits ------------------------------------------- */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-text">Today's Habits</h2>
            <span className="text-xs text-text-3">
              {completedCount}/{habitsCount} done
            </span>
          </div>

          {habits.length === 0 ? (
            <Card className="flex flex-col items-center py-8 gap-3">
              <Zap className="h-8 w-8 text-text-3" />
              <p className="text-sm text-text-2">No habits yet -- add your first one</p>
              <Button size="sm" onClick={() => navigate('/habits')}>
                Add Habit
              </Button>
            </Card>
          ) : (
            <motion.ul
              className="space-y-2"
              variants={listContainer}
              initial="hidden"
              animate="visible"
            >
              {habits.map((habit) => {
                const done = completedIds.has(habit.id);
                const streak = completions ? calculateStreak(completions, habit.id) : 0;
                const IconComponent = CATEGORY_ICONS[habit.category] ?? Sparkles;

                return (
                  <motion.li key={habit.id} variants={listItem}>
                    <Card
                      className="flex items-center gap-3"
                      onClick={() => toggleCompletion(habit.id)}
                    >
                      {/* Checkbox */}
                      <button
                        aria-label={done ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
                        className="shrink-0"
                      >
                        {done ? (
                          <Check className="h-6 w-6 text-green" />
                        ) : (
                          <Circle className="h-6 w-6 text-text-3" />
                        )}
                      </button>

                      {/* Category icon */}
                      <div className="h-8 w-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                        <IconComponent className="h-4 w-4 text-text-2" />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            done ? 'text-text-3 line-through' : 'text-text'
                          }`}
                        >
                          {habit.name}
                        </p>
                        {streak > 0 && (
                          <p className="text-[11px] text-text-3 flex items-center gap-1 mt-0.5">
                            <Flame className="h-3 w-3 text-orange" />
                            {streak}d streak
                          </p>
                        )}
                      </div>

                      {/* Status pill */}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          done
                            ? 'bg-green/10 text-green'
                            : 'bg-surface-2 text-text-3'
                        }`}
                      >
                        {done ? 'Done' : 'Pending'}
                      </span>
                    </Card>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>

        {/* ---- Quick Life Stats ----------------------------------------- */}
        <section>
          <h2 className="text-base font-semibold text-text mb-3">Life Stats</h2>
          <div className="grid grid-cols-3 gap-2">
            {/* Water */}
            <Card className="flex flex-col items-center py-3 gap-1.5">
              <Droplets className="h-5 w-5 text-blue-400" />
              <span className="text-lg font-bold text-text">
                {waterLog ? waterLog.glasses : '--'}
              </span>
              <span className="text-[10px] text-text-3 uppercase tracking-wide">Glasses</span>
            </Card>

            {/* Sleep */}
            <Card className="flex flex-col items-center py-3 gap-1.5">
              <Moon className="h-5 w-5 text-indigo-400" />
              <span className="text-lg font-bold text-text">
                {sleepLog ? `${sleepLog.hours}h` : '--'}
              </span>
              <span className="text-[10px] text-text-3 uppercase tracking-wide">Sleep</span>
            </Card>

            {/* Mood */}
            <Card className="flex flex-col items-center py-3 gap-1.5">
              <Heart className="h-5 w-5 text-red" />
              <span className="text-lg font-bold text-text">
                {moodLog ? moodLabel(moodLog.mood) : '--'}
              </span>
              <span className="text-[10px] text-text-3 uppercase tracking-wide">Mood</span>
            </Card>
          </div>
        </section>

        {/* ---- Motivational Quote --------------------------------------- */}
        <Card glow="red" className="relative overflow-hidden">
          <Quote className="absolute -top-1 -left-1 h-10 w-10 text-red/20" />
          <p className="text-sm text-text leading-relaxed pl-6 italic">
            &ldquo;{quote}&rdquo;
          </p>
        </Card>

        {/* ---- Quick Actions -------------------------------------------- */}
        <section>
          <h2 className="text-base font-semibold text-text mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="flex items-center gap-3"
              onClick={() => navigate('/gym')}
            >
              <div className="h-10 w-10 rounded-xl bg-orange/10 flex items-center justify-center shrink-0">
                <Dumbbell className="h-5 w-5 text-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Log Workout</p>
                <p className="text-[11px] text-text-3">Track your session</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />
            </Card>

            <Card
              className="flex items-center gap-3"
              onClick={() => navigate('/discipline')}
            >
              <div className="h-10 w-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Discipline</p>
                <p className="text-[11px] text-text-3">{disciplineStreak}d streak</p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />
            </Card>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
