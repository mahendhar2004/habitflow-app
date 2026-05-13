export type HabitCategory = 'health' | 'career' | 'mind' | 'discipline' | 'communication' | 'custom';
export type HabitColor = 'red' | 'orange' | 'green' | 'blue' | 'yellow';
export type FrequencyType = 'daily' | 'specific_days' | 'x_per_week';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  category: HabitCategory;
  frequency: {
    type: FrequencyType;
    days?: number[];
    timesPerWeek?: number;
  };
  color: HabitColor;
  reminderTime: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Completion {
  id: string;
  habitId: string;
  date: string;
  completedAt: string;
  notes: string | null;
}

export interface Workout {
  id: string;
  date: string;
  templateName: string | null;
  startTime: string;
  endTime: string | null;
  notes: string | null;
}

export interface ExerciseSet {
  id: string;
  workoutId: string;
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weight: number;
  isPersonalRecord: boolean;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom: boolean;
}

export interface BodyStat {
  id: string;
  date: string;
  weight: number | null;
  chest: number | null;
  arms: number | null;
  waist: number | null;
  bodyFat: number | null;
}

export interface DisciplineLog {
  id: string;
  type: 'clean' | 'urge_resisted' | 'relapse';
  date: string;
  time: string;
  notes: string | null;
  trigger: string | null;
}

export interface MoodLog {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  note: string | null;
}

export interface WaterLog {
  id: string;
  date: string;
  glasses: number;
  target: number;
}

export interface SleepLog {
  id: string;
  date: string;
  hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
  bedtime: string;
  wakeTime: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  text: string;
  createdAt: string;
}

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'full_body';

export interface WorkoutTemplate {
  name: string;
  muscleGroups: MuscleGroup[];
  exercises: string[];
}
