import { db } from './database';
import { v4 as uuid } from 'uuid';
import type { WorkoutTemplate } from '../types';

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    name: 'Push Day',
    muscleGroups: ['chest', 'shoulders', 'arms'],
    exercises: ['Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Lateral Raises', 'Tricep Pushdowns', 'Chest Flyes'],
  },
  {
    name: 'Pull Day',
    muscleGroups: ['back', 'arms'],
    exercises: ['Deadlift', 'Barbell Rows', 'Lat Pulldowns', 'Face Pulls', 'Barbell Curls', 'Hammer Curls'],
  },
  {
    name: 'Leg Day',
    muscleGroups: ['legs', 'core'],
    exercises: ['Squats', 'Romanian Deadlift', 'Leg Press', 'Leg Curls', 'Calf Raises', 'Hanging Leg Raises'],
  },
  {
    name: 'Upper Body',
    muscleGroups: ['chest', 'back', 'shoulders', 'arms'],
    exercises: ['Bench Press', 'Barbell Rows', 'Overhead Press', 'Lat Pulldowns', 'Bicep Curls', 'Tricep Dips'],
  },
  {
    name: 'Lower Body',
    muscleGroups: ['legs', 'core'],
    exercises: ['Squats', 'Romanian Deadlift', 'Bulgarian Split Squats', 'Leg Press', 'Calf Raises', 'Planks'],
  },
  {
    name: 'Full Body',
    muscleGroups: ['full_body'],
    exercises: ['Squats', 'Bench Press', 'Barbell Rows', 'Overhead Press', 'Deadlift', 'Planks'],
  },
];

const DEFAULT_EXERCISES: { name: string; muscleGroup: string }[] = [
  { name: 'Bench Press', muscleGroup: 'chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
  { name: 'Chest Flyes', muscleGroup: 'chest' },
  { name: 'Dumbbell Press', muscleGroup: 'chest' },
  { name: 'Push Ups', muscleGroup: 'chest' },
  { name: 'Cable Crossovers', muscleGroup: 'chest' },
  { name: 'Deadlift', muscleGroup: 'back' },
  { name: 'Barbell Rows', muscleGroup: 'back' },
  { name: 'Lat Pulldowns', muscleGroup: 'back' },
  { name: 'Pull Ups', muscleGroup: 'back' },
  { name: 'Seated Cable Rows', muscleGroup: 'back' },
  { name: 'T-Bar Rows', muscleGroup: 'back' },
  { name: 'Face Pulls', muscleGroup: 'back' },
  { name: 'Overhead Press', muscleGroup: 'shoulders' },
  { name: 'Lateral Raises', muscleGroup: 'shoulders' },
  { name: 'Front Raises', muscleGroup: 'shoulders' },
  { name: 'Reverse Flyes', muscleGroup: 'shoulders' },
  { name: 'Arnold Press', muscleGroup: 'shoulders' },
  { name: 'Barbell Curls', muscleGroup: 'arms' },
  { name: 'Hammer Curls', muscleGroup: 'arms' },
  { name: 'Tricep Pushdowns', muscleGroup: 'arms' },
  { name: 'Tricep Dips', muscleGroup: 'arms' },
  { name: 'Skull Crushers', muscleGroup: 'arms' },
  { name: 'Concentration Curls', muscleGroup: 'arms' },
  { name: 'Squats', muscleGroup: 'legs' },
  { name: 'Romanian Deadlift', muscleGroup: 'legs' },
  { name: 'Leg Press', muscleGroup: 'legs' },
  { name: 'Leg Curls', muscleGroup: 'legs' },
  { name: 'Leg Extensions', muscleGroup: 'legs' },
  { name: 'Bulgarian Split Squats', muscleGroup: 'legs' },
  { name: 'Calf Raises', muscleGroup: 'legs' },
  { name: 'Lunges', muscleGroup: 'legs' },
  { name: 'Planks', muscleGroup: 'core' },
  { name: 'Hanging Leg Raises', muscleGroup: 'core' },
  { name: 'Russian Twists', muscleGroup: 'core' },
  { name: 'Ab Wheel Rollouts', muscleGroup: 'core' },
  { name: 'Cable Crunches', muscleGroup: 'core' },
];

export async function seedDatabase() {
  const count = await db.exerciseLibrary.count();
  if (count === 0) {
    await db.exerciseLibrary.bulkAdd(
      DEFAULT_EXERCISES.map((e) => ({
        id: uuid(),
        name: e.name,
        muscleGroup: e.muscleGroup,
        isCustom: false,
      }))
    );
  }
}

export const MOTIVATIONAL_QUOTES = [
  "The successful man is the average man, focused.",
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be extreme, just consistent.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Small daily improvements over time lead to stunning results.",
  "Your body can stand almost anything. It's your mind that you have to convince.",
  "The only bad workout is the one that didn't happen.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't count the days, make the days count.",
  "Winners are not people who never fail, but people who never quit.",
  "The harder you work, the luckier you get.",
  "Push yourself, because no one else is going to do it for you.",
  "It's not about being the best. It's about being better than you were yesterday.",
  "Suffer the pain of discipline or suffer the pain of regret.",
  "Your future is created by what you do today, not tomorrow.",
];
