import { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuid } from 'uuid';
import {
  Plus,
  Flame,
  Pencil,
  Trash2,
  Heart,
  Briefcase,
  Brain,
  MessageCircle,
  Star,
  Dumbbell,
  BookOpen,
  Code,
  Target,
  Zap,
  Coffee,
  Sunrise,
  Moon,
  Music,
  Camera,
  Globe,
  Trophy,
  Shield,
  Compass,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StreakDots } from '../components/charts/StreakDots';
import { PageContainer } from '../components/layout/PageContainer';
import { db } from '../db/database';
import { today, getLast7Days } from '../utils/dates';
import { calculateStreak } from '../utils/calculations';
import type { Habit, HabitCategory, HabitColor, FrequencyType } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { value: HabitCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'health', label: 'Health' },
  { value: 'career', label: 'Career' },
  { value: 'mind', label: 'Mind' },
  { value: 'discipline', label: 'Discipline' },
  { value: 'communication', label: 'Communication' },
];

const CATEGORY_OPTIONS = [
  { value: 'health', label: 'Health' },
  { value: 'career', label: 'Career' },
  { value: 'mind', label: 'Mind' },
  { value: 'discipline', label: 'Discipline' },
  { value: 'communication', label: 'Communication' },
  { value: 'custom', label: 'Custom' },
];

const CATEGORY_ICONS: Record<HabitCategory, LucideIcon> = {
  health: Heart,
  career: Briefcase,
  mind: Brain,
  discipline: Flame,
  communication: MessageCircle,
  custom: Star,
};

const ICON_PICKER_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Dumbbell', Icon: Dumbbell },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Code', Icon: Code },
  { name: 'Brain', Icon: Brain },
  { name: 'MessageCircle', Icon: MessageCircle },
  { name: 'Heart', Icon: Heart },
  { name: 'Target', Icon: Target },
  { name: 'Zap', Icon: Zap },
  { name: 'Coffee', Icon: Coffee },
  { name: 'Sunrise', Icon: Sunrise },
  { name: 'Moon', Icon: Moon },
  { name: 'Music', Icon: Music },
  { name: 'Camera', Icon: Camera },
  { name: 'Pencil', Icon: Pencil },
  { name: 'Globe', Icon: Globe },
  { name: 'Trophy', Icon: Trophy },
  { name: 'Shield', Icon: Shield },
  { name: 'Star', Icon: Star },
  { name: 'Compass', Icon: Compass },
  { name: 'Rocket', Icon: Rocket },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_PICKER_OPTIONS.map(({ name, Icon }) => [name, Icon]),
);

const COLOR_OPTIONS: { value: HabitColor; hex: string }[] = [
  { value: 'red', hex: '#FF2D55' },
  { value: 'orange', hex: '#FF9500' },
  { value: 'green', hex: '#30D158' },
  { value: 'blue', hex: '#0A84FF' },
  { value: 'yellow', hex: '#FFD60A' },
];

const COLOR_HEX: Record<HabitColor, string> = {
  red: '#FF2D55',
  orange: '#FF9500',
  green: '#30D158',
  blue: '#0A84FF',
  yellow: '#FFD60A',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: 'Every day',
  specific_days: 'Specific days',
  x_per_week: 'x / week',
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface HabitFormState {
  name: string;
  icon: string;
  category: HabitCategory;
  frequencyType: FrequencyType;
  specificDays: number[];
  timesPerWeek: number;
  color: HabitColor;
}

const DEFAULT_FORM: HabitFormState = {
  name: '',
  icon: 'Dumbbell',
  category: 'health',
  frequencyType: 'daily',
  specificDays: [],
  timesPerWeek: 3,
  color: 'red',
};

function formFromHabit(habit: Habit): HabitFormState {
  return {
    name: habit.name,
    icon: habit.icon,
    category: habit.category,
    frequencyType: habit.frequency.type,
    specificDays: habit.frequency.days ?? [],
    timesPerWeek: habit.frequency.timesPerWeek ?? 3,
    color: habit.color,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Habits() {
  const [activeCategory, setActiveCategory] = useState<HabitCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [form, setForm] = useState<HabitFormState>(DEFAULT_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ---- Data ----------------------------------------------------------------

  const habits = useLiveQuery(() => db.habits.orderBy('sortOrder').toArray(), []);
  const completions = useLiveQuery(() => db.completions.toArray(), []);

  const last7 = useMemo(() => getLast7Days(), []);

  const filteredHabits = useMemo(() => {
    if (!habits) return [];
    if (activeCategory === 'all') return habits;
    return habits.filter((h) => h.category === activeCategory);
  }, [habits, activeCategory]);

  // ---- Helpers -------------------------------------------------------------

  const getStreakDays = useCallback(
    (habitId: string): boolean[] => {
      if (!completions) return Array(7).fill(false) as boolean[];
      return last7.map((d) => completions.some((c) => c.habitId === habitId && c.date === d));
    },
    [completions, last7],
  );

  const getStreak = useCallback(
    (habitId: string): number => {
      if (!completions) return 0;
      return calculateStreak(completions, habitId);
    },
    [completions],
  );

  const frequencyLabel = (habit: Habit): string => {
    if (habit.frequency.type === 'daily') return 'Every day';
    if (habit.frequency.type === 'x_per_week') return `${habit.frequency.timesPerWeek}x / week`;
    if (habit.frequency.type === 'specific_days' && habit.frequency.days) {
      return habit.frequency.days.map((d) => DAY_LABELS[d]).join(', ');
    }
    return '';
  };

  // ---- Modal ---------------------------------------------------------------

  const openAdd = () => {
    setEditingHabit(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setForm(formFromHabit(habit));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingHabit(null);
    setConfirmDeleteId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const habitData: Omit<Habit, 'id' | 'sortOrder' | 'createdAt'> & Partial<Pick<Habit, 'id' | 'sortOrder' | 'createdAt'>> = {
      name: form.name.trim(),
      icon: form.icon,
      category: form.category,
      frequency: {
        type: form.frequencyType,
        ...(form.frequencyType === 'specific_days' ? { days: form.specificDays } : {}),
        ...(form.frequencyType === 'x_per_week' ? { timesPerWeek: form.timesPerWeek } : {}),
      },
      color: form.color,
      reminderTime: null,
    };

    if (editingHabit) {
      await db.habits.update(editingHabit.id, habitData);
    } else {
      await db.habits.add({
        ...habitData,
        id: uuid(),
        sortOrder: (habits?.length ?? 0) + 1,
        createdAt: new Date().toISOString(),
      });
    }

    closeModal();
  };

  const handleDelete = async () => {
    if (!editingHabit) return;
    if (confirmDeleteId !== editingHabit.id) {
      setConfirmDeleteId(editingHabit.id);
      return;
    }
    await db.habits.delete(editingHabit.id);
    await db.completions.where('habitId').equals(editingHabit.id).delete();
    closeModal();
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      specificDays: prev.specificDays.includes(day)
        ? prev.specificDays.filter((d) => d !== day)
        : [...prev.specificDays, day].sort(),
    }));
  };

  // ---- Render --------------------------------------------------------------

  const isLoading = habits === undefined || completions === undefined;

  return (
    <PageContainer
      title="Habits"
      subtitle={`${today()}`}
      rightAction={
        <button
          onClick={openAdd}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-red text-white shadow-lg shadow-red/30 active:scale-95 transition-transform"
          aria-label="Add new habit"
        >
          <Plus size={20} />
        </button>
      }
    >
      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat.value
                ? 'bg-red text-white shadow-md shadow-red/20'
                : 'bg-surface-2 text-text-2 border border-border'
            }`}
            aria-label={`Filter by ${cat.label}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Habit list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mb-4">
            <Target size={28} className="text-text-3" />
          </div>
          <p className="text-text-2 text-sm font-medium mb-1">No habits yet</p>
          <p className="text-text-3 text-xs mb-4">Tap the + button to create your first habit</p>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={16} />
            Create Habit
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredHabits.map((habit) => {
              const CategoryIcon = CATEGORY_ICONS[habit.category];
              const HabitIcon = ICON_MAP[habit.icon] ?? CategoryIcon;
              const hex = COLOR_HEX[habit.color];
              const streak = getStreak(habit.id);
              const streakDays = getStreakDays(habit.id);

              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${hex}20` }}
                    >
                      <HabitIcon size={20} style={{ color: hex }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{habit.name}</p>
                      <p className="text-[11px] text-text-3 truncate">
                        {habit.category.charAt(0).toUpperCase() + habit.category.slice(1)} &middot; {frequencyLabel(habit)}
                      </p>
                      <div className="mt-1">
                        <StreakDots days={streakDays} color={hex} />
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
                      <Flame size={16} style={{ color: streak > 0 ? hex : 'rgba(255,255,255,0.15)' }} />
                      <span
                        className="text-xs font-bold"
                        style={{ color: streak > 0 ? hex : 'rgba(255,255,255,0.25)' }}
                      >
                        {streak}
                      </span>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(habit);
                      }}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface-2 text-text-3 transition-colors"
                      aria-label={`Edit ${habit.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingHabit ? 'Edit Habit' : 'New Habit'}
      >
        <div className="space-y-5">
          {/* Name */}
          <Input
            label="Name"
            placeholder="e.g. Morning Run"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wider">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_PICKER_OPTIONS.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: name }))}
                  className={`flex items-center justify-center w-full aspect-square rounded-xl transition-all ${
                    form.icon === name
                      ? 'bg-red/20 border-2 border-red text-red'
                      : 'bg-surface-2 border border-border text-text-2 hover:bg-surface-3'
                  }`}
                  aria-label={`Select ${name} icon`}
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as HabitCategory }))
            }
          />

          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wider">
              Frequency
            </label>
            <div className="flex gap-2">
              {(['daily', 'specific_days', 'x_per_week'] as FrequencyType[]).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, frequencyType: ft }))}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    form.frequencyType === ft
                      ? 'bg-red/20 border border-red text-red'
                      : 'bg-surface-2 border border-border text-text-2'
                  }`}
                >
                  {FREQUENCY_LABELS[ft]}
                </button>
              ))}
            </div>

            {/* Specific days picker */}
            {form.frequencyType === 'specific_days' && (
              <div className="flex gap-1.5 pt-1">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                      form.specificDays.includes(idx)
                        ? 'bg-red text-white'
                        : 'bg-surface-2 text-text-3 border border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Times per week */}
            {form.frequencyType === 'x_per_week' && (
              <div className="pt-1">
                <Input
                  label="Times per week"
                  type="number"
                  min={1}
                  max={7}
                  value={form.timesPerWeek}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      timesPerWeek: Math.max(1, Math.min(7, parseInt(e.target.value) || 1)),
                    }))
                  }
                />
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wider">Color</label>
            <div className="flex gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  className="relative w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Select ${c.value} color`}
                >
                  {form.color === c.value && (
                    <div
                      className="absolute inset-0 rounded-full border-2"
                      style={{ borderColor: c.hex, transform: 'scale(1.35)' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" fullWidth onClick={handleSave} disabled={!form.name.trim()}>
              {editingHabit ? 'Save Changes' : 'Create Habit'}
            </Button>

            {editingHabit && (
              <Button
                variant="danger"
                fullWidth
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                {confirmDeleteId === editingHabit.id
                  ? 'Tap again to confirm delete'
                  : 'Delete Habit'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
