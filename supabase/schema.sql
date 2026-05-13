-- HabitFlow Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Habits
create table if not exists habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'target',
  category text not null default 'custom',
  frequency jsonb not null default '{"type":"daily"}',
  color text not null default 'red',
  reminder_time text,
  sort_order integer not null default 0,
  created_at text not null
);

-- Completions
create table if not exists completions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  date text not null,
  completed_at text not null,
  notes text
);

-- Workouts
create table if not exists workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  template_name text,
  start_time text not null,
  end_time text,
  notes text
);

-- Exercise Sets
create table if not exists exercise_sets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  exercise_name text not null,
  muscle_group text not null,
  set_number integer not null,
  reps integer not null,
  weight numeric not null,
  is_personal_record boolean not null default false
);

-- Exercise Library
create table if not exists exercise_library (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  is_custom boolean not null default false
);

-- Body Stats
create table if not exists body_stats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  weight numeric,
  chest numeric,
  arms numeric,
  waist numeric,
  body_fat numeric
);

-- Discipline Log
create table if not exists discipline_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  date text not null,
  time text not null,
  notes text,
  trigger text
);

-- Mood Log
create table if not exists mood_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  mood integer not null,
  energy integer not null,
  note text
);

-- Water Log
create table if not exists water_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  glasses integer not null default 0,
  target integer not null default 8
);

-- Sleep Log
create table if not exists sleep_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  hours numeric not null,
  quality integer not null,
  bedtime text not null,
  wake_time text not null
);

-- Journal
create table if not exists journal (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  text text not null,
  created_at text not null
);

-- ============================================================================
-- Row Level Security (RLS) - Users can only access their own data
-- ============================================================================

alter table habits enable row level security;
alter table completions enable row level security;
alter table workouts enable row level security;
alter table exercise_sets enable row level security;
alter table exercise_library enable row level security;
alter table body_stats enable row level security;
alter table discipline_log enable row level security;
alter table mood_log enable row level security;
alter table water_log enable row level security;
alter table sleep_log enable row level security;
alter table journal enable row level security;

-- Create RLS policies for each table (same pattern: user can CRUD own rows)
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'habits', 'completions', 'workouts', 'exercise_sets', 'exercise_library',
    'body_stats', 'discipline_log', 'mood_log', 'water_log', 'sleep_log', 'journal'
  ]) loop
    execute format('
      create policy "Users can view own %1$s" on %1$s
        for select using (auth.uid() = user_id);
      create policy "Users can insert own %1$s" on %1$s
        for insert with check (auth.uid() = user_id);
      create policy "Users can update own %1$s" on %1$s
        for update using (auth.uid() = user_id);
      create policy "Users can delete own %1$s" on %1$s
        for delete using (auth.uid() = user_id);
    ', tbl);
  end loop;
end $$;

-- ============================================================================
-- Indexes for performance
-- ============================================================================

create index if not exists idx_completions_user_date on completions(user_id, date);
create index if not exists idx_completions_habit_date on completions(habit_id, date);
create index if not exists idx_workouts_user_date on workouts(user_id, date);
create index if not exists idx_exercise_sets_workout on exercise_sets(workout_id);
create index if not exists idx_discipline_log_user_date on discipline_log(user_id, date);
create index if not exists idx_mood_log_user_date on mood_log(user_id, date);
create index if not exists idx_water_log_user_date on water_log(user_id, date);
create index if not exists idx_sleep_log_user_date on sleep_log(user_id, date);
create index if not exists idx_journal_user_date on journal(user_id, date);
