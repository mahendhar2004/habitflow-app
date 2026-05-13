import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from 'recharts';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Target,
  Brain,
  Shield,
  MessageCircle,
  Sparkles,
  Calendar,
  Dumbbell,
  ChevronDown,
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Heatmap } from '../components/charts/Heatmap';
import { PageContainer } from '../components/layout/PageContainer';
import { db } from '../db/database';
import { today, getLastNDays, getDayLabel } from '../utils/dates';
import { calculateStreak } from '../utils/calculations';
import type { HabitCategory, HabitColor } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FILTERS = ['7d', '30d', '90d', 'All'] as const;
type FilterRange = (typeof FILTERS)[number];

const FILTER_DAYS: Record<FilterRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  All: null,
};

const CATEGORY_ICONS: Record<HabitCategory, React.FC<React.SVGProps<SVGSVGElement>>> = {
  health: Heart,
  career: Target,
  mind: Brain,
  discipline: Shield,
  communication: MessageCircle,
  custom: Sparkles,
};

const COLOR_MAP: Record<HabitColor, string> = {
  red: '#FF2D55',
  orange: '#FF9500',
  green: '#30D158',
  blue: '#0A84FF',
  yellow: '#FFD60A',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TOOLTIP_STYLE = {
  backgroundColor: '#2C2C2E',
  border: '1px solid #3A3A3C',
  borderRadius: '8px',
  padding: '8px 12px',
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ---------------------------------------------------------------------------
// Custom Tooltip for bar chart
// ---------------------------------------------------------------------------
interface BarTooltipPayload {
  payload?: { date: string; completed: number; total: number; pct: number };
}

function CompletionTooltip({ active, payload }: { active?: boolean; payload?: BarTooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;

  return (
    <div style={TOOLTIP_STYLE}>
      <p className="text-xs text-text-2 mb-0.5">{d.date}</p>
      <p className="text-sm font-semibold text-text">
        {d.pct}% <span className="text-text-3 font-normal">({d.completed}/{d.total} habits)</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip for line chart
// ---------------------------------------------------------------------------
function WeightTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { date: string; weight: number } }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;

  return (
    <div style={TOOLTIP_STYLE}>
      <p className="text-xs text-text-2 mb-0.5">{d.date}</p>
      <p className="text-sm font-semibold text-text">{d.weight} kg</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics Page
// ---------------------------------------------------------------------------
export function Analytics() {
  const [filter, setFilter] = useState<FilterRange>('30d');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const todayStr = today();

  // --- Data queries --------------------------------------------------------
  const habits = useLiveQuery(() => db.habits.orderBy('sortOrder').toArray(), []);
  const completions = useLiveQuery(() => db.completions.toArray(), []);
  const exerciseSets = useLiveQuery(() => db.exerciseSets.toArray(), []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), []);
  const disciplineLogs = useLiveQuery(() => db.disciplineLog.toArray(), []);

  // --- Derived: date range -------------------------------------------------
  const rangeDays = useMemo(() => {
    const n = FILTER_DAYS[filter];
    if (n !== null) return getLastNDays(n);
    // "All" — from earliest habit creation or 365 days, whichever is shorter
    if (!habits || habits.length === 0) return getLastNDays(30);
    const earliest = habits.map((h) => h.createdAt).sort()[0];
    const diff = Math.floor(
      (new Date(todayStr + 'T00:00:00').getTime() - new Date(earliest.split('T')[0] + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return getLastNDays(Math.max(diff + 1, 7));
  }, [filter, habits, todayStr]);

  // --- Derived: completion bar chart data ----------------------------------
  const barChartData = useMemo(() => {
    if (!habits || !completions || habits.length === 0) return [];

    return rangeDays.map((day) => {
      const completed = habits.filter((h) =>
        completions.some((c) => c.habitId === h.id && c.date === day),
      ).length;
      const total = habits.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const label = filter === '7d' ? getDayLabel(day) : day.slice(5); // MM-DD

      return { date: day, label, completed, total, pct };
    });
  }, [rangeDays, habits, completions, filter]);

  // --- Derived: heatmap data (91 days) ------------------------------------
  const heatmapData = useMemo(() => {
    if (!completions) return {};
    const map: Record<string, number> = {};
    for (const c of completions) {
      map[c.date] = (map[c.date] || 0) + 1;
    }
    return map;
  }, [completions]);

  // --- Derived: streaks leaderboard ---------------------------------------
  const streakLeaderboard = useMemo(() => {
    if (!habits || !completions) return [];
    return habits
      .map((h) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        color: h.color,
        streak: calculateStreak(completions, h.id),
      }))
      .sort((a, b) => b.streak - a.streak);
  }, [habits, completions]);

  // --- Derived: unique exercises for progressive overload ------------------
  const exerciseNames = useMemo(() => {
    if (!exerciseSets || exerciseSets.length === 0) return [];
    const names = [...new Set(exerciseSets.map((s) => s.exerciseName))].sort();
    return names;
  }, [exerciseSets]);

  // Auto-select first exercise
  const activeExercise = selectedExercise || exerciseNames[0] || '';

  // --- Derived: progressive overload line chart data ----------------------
  const overloadData = useMemo(() => {
    if (!exerciseSets || !workouts || !activeExercise) return [];

    // Build workout date lookup
    const workoutDateMap = new Map<string, string>();
    for (const w of workouts) {
      workoutDateMap.set(w.id, w.date);
    }

    // Group sets by date, find max weight per date
    const dateMaxWeight = new Map<string, number>();
    for (const s of exerciseSets) {
      if (s.exerciseName !== activeExercise) continue;
      const date = workoutDateMap.get(s.workoutId);
      if (!date) continue;
      const current = dateMaxWeight.get(date) ?? 0;
      if (s.weight > current) dateMaxWeight.set(date, s.weight);
    }

    return [...dateMaxWeight.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weight]) => ({ date: date.slice(5), weight, fullDate: date }));
  }, [exerciseSets, workouts, activeExercise]);

  // --- Derived: insight cards ---------------------------------------------
  const insights = useMemo(() => {
    if (!habits || !completions || habits.length === 0) {
      return { bestDay: '--', worstDay: '--', weeklyAvg: 0 };
    }

    // Day-of-week average completion rate
    const dayTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];

    for (const day of rangeDays) {
      const dow = new Date(day + 'T00:00:00').getDay();
      const completed = habits.filter((h) =>
        completions.some((c) => c.habitId === h.id && c.date === day),
      ).length;
      const pct = habits.length > 0 ? (completed / habits.length) * 100 : 0;
      dayTotals[dow] += pct;
      dayCounts[dow] += 1;
    }

    const dayAverages = dayTotals.map((total, i) =>
      dayCounts[i] > 0 ? total / dayCounts[i] : 0,
    );

    let bestIdx = 0;
    let worstIdx = 0;
    for (let i = 0; i < 7; i++) {
      if (dayCounts[i] === 0) continue;
      if (dayAverages[i] > dayAverages[bestIdx]) bestIdx = i;
      if (dayAverages[i] < dayAverages[worstIdx] || dayCounts[worstIdx] === 0) worstIdx = i;
    }

    // Weekly average: habits completed per day this week
    const last7 = getLastNDays(7);
    let weekSum = 0;
    for (const day of last7) {
      weekSum += habits.filter((h) =>
        completions.some((c) => c.habitId === h.id && c.date === day),
      ).length;
    }

    return {
      bestDay: DAY_NAMES[bestIdx],
      bestDayPct: Math.round(dayAverages[bestIdx]),
      worstDay: DAY_NAMES[worstIdx],
      worstDayPct: Math.round(dayAverages[worstIdx]),
      weeklyAvg: Math.round((weekSum / 7) * 10) / 10,
    };
  }, [habits, completions, rangeDays]);

  // --- Derived: discipline trend ------------------------------------------
  const disciplineTrend = useMemo(() => {
    if (!disciplineLogs || disciplineLogs.length === 0) return null;

    const relapses = disciplineLogs
      .filter((l) => l.type === 'relapse')
      .map((l) => l.date)
      .sort();

    if (relapses.length < 2) return null;

    // Split into first half and second half
    const mid = Math.floor(relapses.length / 2);
    const firstHalfCount = mid;
    const secondHalfCount = relapses.length - mid;

    // Calculate days span for each half
    const firstStart = relapses[0];
    const firstEnd = relapses[mid - 1];
    const secondStart = relapses[mid];
    const secondEnd = relapses[relapses.length - 1];

    const firstDays = Math.max(
      1,
      Math.floor(
        (new Date(firstEnd + 'T00:00:00').getTime() - new Date(firstStart + 'T00:00:00').getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );
    const secondDays = Math.max(
      1,
      Math.floor(
        (new Date(secondEnd + 'T00:00:00').getTime() - new Date(secondStart + 'T00:00:00').getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );

    const firstRate = firstHalfCount / firstDays;
    const secondRate = secondHalfCount / secondDays;
    const improving = secondRate <= firstRate;

    return { improving, totalRelapses: relapses.length };
  }, [disciplineLogs]);

  // --- Loading guard -------------------------------------------------------
  if (!habits || !completions) {
    return (
      <PageContainer title="Analytics">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      </PageContainer>
    );
  }

  // --- Render --------------------------------------------------------------
  return (
    <PageContainer title="Analytics" subtitle="Track your progress over time">
      <motion.div
        className="space-y-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ---- Time Filter Tabs ------------------------------------------ */}
        <motion.div variants={fadeUp} className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-red text-white'
                    : 'bg-surface text-text-2 border border-border hover:bg-surface-2'
                }`}
                aria-label={`Filter by ${f}`}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ---- Completion Bar Chart -------------------------------------- */}
        <motion.div variants={fadeUp}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-red" />
              <h2 className="text-sm font-semibold text-text">Daily Completion Rate</h2>
            </div>

            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barChartData} barCategoryGap="20%">
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 10 }}
                    interval={filter === '7d' ? 0 : 'preserveStartEnd'}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8E8E93', fontSize: 10 }}
                    tickFormatter={(v: number) => `${v}%`}
                    width={36}
                  />
                  <Tooltip
                    content={<CompletionTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar
                    dataKey="pct"
                    fill="#FF2D55"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-text-3 text-sm">
                No data yet
              </div>
            )}
          </Card>
        </motion.div>

        {/* ---- Activity Heatmap ------------------------------------------ */}
        <motion.div variants={fadeUp}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-green" />
              <h2 className="text-sm font-semibold text-text">Activity Heatmap</h2>
              <span className="text-[10px] text-text-3 ml-auto">Last 91 days</span>
            </div>
            <Heatmap data={heatmapData} days={91} color="#FF2D55" />
          </Card>
        </motion.div>

        {/* ---- Insight Cards --------------------------------------------- */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-3 gap-2">
            <Card className="flex flex-col items-center py-3 gap-1.5">
              <TrendingUp className="h-5 w-5 text-green" />
              <span className="text-lg font-bold text-text">{insights.bestDay}</span>
              <span className="text-[10px] text-text-3 uppercase tracking-wide text-center">
                Best Day
              </span>
              {insights.bestDayPct !== undefined && (
                <span className="text-[10px] text-green">{insights.bestDayPct}% avg</span>
              )}
            </Card>

            <Card className="flex flex-col items-center py-3 gap-1.5">
              <TrendingDown className="h-5 w-5 text-orange" />
              <span className="text-lg font-bold text-text">{insights.worstDay}</span>
              <span className="text-[10px] text-text-3 uppercase tracking-wide text-center">
                Weak Spot
              </span>
              {insights.worstDayPct !== undefined && (
                <span className="text-[10px] text-orange">{insights.worstDayPct}% avg</span>
              )}
            </Card>

            <Card className="flex flex-col items-center py-3 gap-1.5">
              <Activity className="h-5 w-5 text-blue" />
              <span className="text-lg font-bold text-text">{insights.weeklyAvg}</span>
              <span className="text-[10px] text-text-3 uppercase tracking-wide text-center">
                Daily Avg
              </span>
              <span className="text-[10px] text-text-3">this week</span>
            </Card>
          </div>
        </motion.div>

        {/* ---- Top Streaks Leaderboard ----------------------------------- */}
        <motion.div variants={fadeUp}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-4 w-4 text-orange" />
              <h2 className="text-sm font-semibold text-text">Top Streaks</h2>
            </div>

            {streakLeaderboard.length === 0 ? (
              <p className="text-sm text-text-3 text-center py-4">
                No habits yet -- add some to see streaks
              </p>
            ) : (
              <ul className="space-y-2.5">
                {streakLeaderboard.map((item, index) => {
                  const IconComponent = CATEGORY_ICONS[item.category] ?? Sparkles;
                  const color = COLOR_MAP[item.color] ?? '#FF2D55';

                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="text-[11px] text-text-3 w-5 text-right font-medium">
                        {index + 1}
                      </span>
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <IconComponent
                          className="h-3.5 w-3.5"
                          style={{ color }}
                        />
                      </div>
                      <span className="text-sm text-text flex-1 truncate">{item.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Flame className="h-3.5 w-3.5" style={{ color }} />
                        <span
                          className="text-sm font-semibold"
                          style={{ color }}
                        >
                          {item.streak}d
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* ---- Gym Progressive Overload ---------------------------------- */}
        {exerciseNames.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="h-4 w-4 text-green" />
                <h2 className="text-sm font-semibold text-text">Progressive Overload</h2>
              </div>

              {/* Exercise selector */}
              <div className="relative mb-4">
                <select
                  value={activeExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-text pr-8 focus:outline-none focus:border-green"
                  aria-label="Select exercise"
                >
                  {exerciseNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3 pointer-events-none" />
              </div>

              {overloadData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={overloadData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8E8E93', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8E8E93', fontSize: 10 }}
                      tickFormatter={(v: number) => `${v}kg`}
                      width={40}
                    />
                    <Tooltip content={<WeightTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#30D158"
                      strokeWidth={2}
                      dot={{ fill: '#30D158', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#30D158', stroke: '#1C1C1E', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-text-3 text-sm">
                  {overloadData.length === 1
                    ? 'Need at least 2 sessions to show trend'
                    : 'No data for this exercise'}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ---- Discipline Trend ------------------------------------------ */}
        {disciplineTrend && (
          <motion.div variants={fadeUp}>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-green" />
                <h2 className="text-sm font-semibold text-text">Discipline Trend</h2>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-text-2">
                  {disciplineTrend.improving
                    ? 'Relapse frequency is decreasing. Keep going.'
                    : 'Relapses are still frequent. Stay focused on your triggers.'}
                </p>

                {/* Gradient bar: red -> green */}
                <div className="relative h-3 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: disciplineTrend.improving
                        ? 'linear-gradient(90deg, #FF2D55 0%, #FF9500 40%, #30D158 100%)'
                        : 'linear-gradient(90deg, #FF2D55 0%, #FF9500 60%, #FF2D55 100%)',
                    }}
                  />
                  <motion.div
                    className="absolute top-0 h-full bg-surface/50 rounded-r-full"
                    initial={{ width: '100%' }}
                    animate={{ width: disciplineTrend.improving ? '15%' : '55%' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ right: 0 }}
                  />
                </div>

                <div className="flex justify-between text-[10px]">
                  <span className="text-red">More relapses</span>
                  <span className="text-green">Clean streak</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  );
}
