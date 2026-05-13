import Dexie, { type Table } from 'dexie';
import type {
  Habit, Completion, Workout, ExerciseSet, ExerciseLibraryItem,
  BodyStat, DisciplineLog, MoodLog, WaterLog, SleepLog, JournalEntry,
} from '../types';

class HabitFlowDB extends Dexie {
  habits!: Table<Habit>;
  completions!: Table<Completion>;
  workouts!: Table<Workout>;
  exerciseSets!: Table<ExerciseSet>;
  exerciseLibrary!: Table<ExerciseLibraryItem>;
  bodyStats!: Table<BodyStat>;
  disciplineLog!: Table<DisciplineLog>;
  moodLog!: Table<MoodLog>;
  waterLog!: Table<WaterLog>;
  sleepLog!: Table<SleepLog>;
  journal!: Table<JournalEntry>;

  constructor() {
    super('HabitFlowDB');
    this.version(1).stores({
      habits: 'id, category, sortOrder, createdAt',
      completions: 'id, habitId, date, [habitId+date]',
      workouts: 'id, date',
      exerciseSets: 'id, workoutId, exerciseName, [workoutId+exerciseName]',
      exerciseLibrary: 'id, muscleGroup, name',
      bodyStats: 'id, date',
      disciplineLog: 'id, type, date',
      moodLog: 'id, date',
      waterLog: 'id, date',
      sleepLog: 'id, date',
      journal: 'id, date',
    });
  }
}

export const db = new HabitFlowDB();
