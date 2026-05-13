import { supabase } from './supabase';
import { db } from '../db/database';

const TABLE_NAMES = [
  'habits', 'completions', 'workouts', 'exerciseSets', 'exerciseLibrary',
  'bodyStats', 'disciplineLog', 'moodLog', 'waterLog', 'sleepLog', 'journal',
] as const;

type TableName = typeof TABLE_NAMES[number];

// Map local table names to Supabase table names (snake_case)
const SUPABASE_TABLE_MAP: Record<TableName, string> = {
  habits: 'habits',
  completions: 'completions',
  workouts: 'workouts',
  exerciseSets: 'exercise_sets',
  exerciseLibrary: 'exercise_library',
  bodyStats: 'body_stats',
  disciplineLog: 'discipline_log',
  moodLog: 'mood_log',
  waterLog: 'water_log',
  sleepLog: 'sleep_log',
  journal: 'journal',
};

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

export async function pushToSupabase(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  try {
    for (const tableName of TABLE_NAMES) {
      const localData = await (db[tableName] as ReturnType<typeof db.table>).toArray();
      if (localData.length === 0) continue;

      const supabaseTable = SUPABASE_TABLE_MAP[tableName];
      const rows = localData.map((row) => ({
        ...camelToSnake(row as Record<string, unknown>),
        user_id: userId,
      }));

      const { error } = await supabase
        .from(supabaseTable)
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.error(`Push error for ${supabaseTable}:`, error);
        return { success: false, error: `Failed to sync ${supabaseTable}: ${error.message}` };
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function pullFromSupabase(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  try {
    for (const tableName of TABLE_NAMES) {
      const supabaseTable = SUPABASE_TABLE_MAP[tableName];

      const { data, error } = await supabase
        .from(supabaseTable)
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error(`Pull error for ${supabaseTable}:`, error);
        return { success: false, error: `Failed to pull ${supabaseTable}: ${error.message}` };
      }

      if (data && data.length > 0) {
        const localTable = db[tableName] as ReturnType<typeof db.table>;
        const camelData = data.map((row: Record<string, unknown>) => {
          const converted = snakeToCamel(row);
          delete converted.userId; // Remove user_id from local storage
          return converted;
        });
        await localTable.bulkPut(camelData);
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function syncAll(userId: string): Promise<{ success: boolean; error?: string }> {
  // Pull first (get remote changes), then push (send local changes)
  const pullResult = await pullFromSupabase(userId);
  if (!pullResult.success) return pullResult;

  const pushResult = await pushToSupabase(userId);
  return pushResult;
}
