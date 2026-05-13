import type { Completion, ExerciseSet, DisciplineLog } from '../types';
import { today } from './dates';

export function calculateStreak(completions: Completion[], habitId: string): number {
  const dates = completions
    .filter((c) => c.habitId === habitId)
    .map((c) => c.date)
    .sort()
    .reverse();

  if (dates.length === 0) return 0;

  const todayStr = today();
  let streak = 0;
  let checkDate = todayStr;

  for (let i = 0; i < 365; i++) {
    if (dates.includes(checkDate)) {
      streak++;
    } else if (checkDate !== todayStr) {
      break;
    }
    const d = new Date(checkDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().split('T')[0];
  }

  return streak;
}

export function calculateDisciplineStreak(logs: DisciplineLog[]): number {
  const relapses = logs
    .filter((l) => l.type === 'relapse')
    .map((l) => l.date)
    .sort()
    .reverse();

  if (relapses.length === 0) {
    const cleanDays = logs.filter((l) => l.type === 'clean');
    if (cleanDays.length === 0) return 0;
    const firstClean = cleanDays.map((c) => c.date).sort()[0];
    const todayStr = today();
    const diff = Math.floor(
      (new Date(todayStr + 'T00:00:00').getTime() - new Date(firstClean + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff + 1;
  }

  const lastRelapse = relapses[0];
  const todayStr = today();
  return Math.floor(
    (new Date(todayStr + 'T00:00:00').getTime() - new Date(lastRelapse + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export function calculateBestDisciplineStreak(logs: DisciplineLog[]): number {
  const relapses = logs
    .filter((l) => l.type === 'relapse')
    .map((l) => l.date)
    .sort();

  if (relapses.length === 0) return calculateDisciplineStreak(logs);

  let best = 0;
  for (let i = 0; i < relapses.length; i++) {
    const prev = i === 0 ? logs.filter((l) => l.type === 'clean').map((c) => c.date).sort()[0] : relapses[i - 1];
    if (!prev) continue;
    const diff = Math.floor(
      (new Date(relapses[i] + 'T00:00:00').getTime() - new Date(prev + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diff > best) best = diff;
  }

  const currentStreak = calculateDisciplineStreak(logs);
  return Math.max(best, currentStreak);
}

export function getPersonalRecord(
  sets: ExerciseSet[],
  exerciseName: string
): { weight: number; reps: number; date?: string } | null {
  const exerciseSets = sets.filter((s) => s.exerciseName === exerciseName);
  if (exerciseSets.length === 0) return null;

  let best = exerciseSets[0];
  for (const s of exerciseSets) {
    if (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = s;
    }
  }
  return { weight: best.weight, reps: best.reps };
}

export function calculateTotalVolume(sets: ExerciseSet[]): number {
  return sets.reduce((total, s) => total + s.weight * s.reps, 0);
}

export function getCompletionRate(completions: Completion[], habitId: string, days: string[]): number {
  const completed = days.filter((d) =>
    completions.some((c) => c.habitId === habitId && c.date === d)
  ).length;
  return days.length > 0 ? Math.round((completed / days.length) * 100) : 0;
}
