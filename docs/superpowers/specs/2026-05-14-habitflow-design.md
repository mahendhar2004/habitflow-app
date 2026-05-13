# HabitFlow — Complete Life Tracker PWA

## Overview

A personal life-tracking Progressive Web App that records habits, gym workouts, discipline streaks, body stats, mood, sleep, water intake, journal entries, and more. Mobile-first responsive design installable on Android via PWA. Apple Fitness-inspired dark theme with red/black glowing aesthetic.

## Design Language

### Theme — "Apple Fitness Glow"

| Token              | Value        | Usage                        |
|--------------------|--------------|------------------------------|
| `--bg`             | `#000000`    | Page background              |
| `--surface`        | `#1C1C1E`    | Cards, modals                |
| `--surface-2`      | `#2C2C2E`    | Elevated cards, hover states |
| `--surface-3`      | `#3A3A3C`    | Input backgrounds            |
| `--red`            | `#FF2D55`    | Primary accent, CTAs, rings  |
| `--red-glow`       | `rgba(255,45,85,0.35)` | Box-shadow / text-shadow glow |
| `--orange`         | `#FF9500`    | Secondary accent (streaks)   |
| `--green`          | `#30D158`    | Success, completions         |
| `--blue`           | `#0A84FF`    | Info, links                  |
| `--yellow`         | `#FFD60A`    | Warnings, highlights         |
| `--text`           | `#FFFFFF`    | Primary text                 |
| `--text-2`         | `#8E8E93`    | Secondary text               |
| `--text-3`         | `#48484A`    | Muted text                   |
| `--border`         | `rgba(255,255,255,0.08)` | Card borders        |

### Typography

- System font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif`
- Bold headers (700/800 weight), regular body (400)
- Sizes: 28px hero, 20px section, 14px body, 12px caption, 10px micro

### Icons

- **Lucide React** — consistent 24px stroke icons, 1.5px stroke width
- NO emojis anywhere in the app
- Icons used for: habit categories, navigation, actions, status indicators

### Responsive Strategy

- Mobile-first: 320px-480px base design
- Tablet: 768px+ (2-column grid)
- Desktop: 1024px+ (3-column grid, sidebar nav option)
- Bottom navigation on mobile, side rail on desktop
- Touch targets: minimum 44px

## Screens & Features

### 1. Dashboard (Home)

- **Header:** Dynamic greeting ("Good morning/afternoon/evening") + date + city
- **Activity rings:** 3 circular progress rings (Apple Fitness style)
  - Ring 1 (red): Habits completed today (e.g., 5/7)
  - Ring 2 (orange): Current streak days
  - Ring 3 (green): Discipline clean days
- **Today's habits:** Checklist — tap to mark done, shows streak count per habit
- **Quick stats row:** Water glasses, sleep hours, mood (from today's logs)
- **Gym summary:** If workout logged today, show exercise count + total volume
- **Quote card:** Random motivational quote, subtle red glow border

### 2. Habits

- **Category filter pills:** All, Health, Career, Mind, Discipline, Communication
- **Habit cards:** Icon, name, category tag, streak fire icon + count, last 7 days dot indicators
- **Add habit form** (bottom sheet modal):
  - Name (text input)
  - Icon picker (Lucide icon grid, ~40 options)
  - Category dropdown
  - Frequency: Daily / Specific days (Mon-Sun toggles) / X times per week
  - Reminder time (time picker)
  - Accent color (red/orange/green/blue/yellow)
- **Edit/delete:** Long-press or swipe on habit card
- **Reorder:** Drag-and-drop habit priority

### 3. Gym Tracker

- **Today's workout:** Start new or continue
- **Muscle group picker:** Chest, Back, Shoulders, Arms, Legs, Core, Full Body
- **Exercise library:** Pre-loaded common exercises per muscle group
  - User can add custom exercises
- **Workout logging flow:**
  1. Select template or create freestyle workout
  2. Add exercises
  3. Per exercise: log sets — each set has reps + weight (kg)
  4. Rest timer between sets (configurable, default 90s)
  5. Finish workout — shows summary (total volume, duration, PRs hit)
- **Pre-built templates:**
  - Push (Chest/Shoulders/Triceps)
  - Pull (Back/Biceps)
  - Legs (Quads/Hamstrings/Calves)
  - Upper Body
  - Lower Body
  - Full Body Compound
- **Progressive overload chart:** Per-exercise line chart showing max weight over time
- **Personal records board:** Best weight per exercise, with date achieved
- **Workout history:** Calendar view — tap a date to see that day's workout
- **Body stats sub-page:**
  - Log: weight, chest, arms, waist, body fat %
  - Trend charts for each measurement
  - Progress photos placeholder (future feature)

### 4. Discipline Tracker (accessible from Dashboard + dedicated view)

- **Big counter:** Large bold number — days since last relapse, with red glow
- **Stats row:** Best streak, urges resisted, total relapses
- **Actions:**
  - "I resisted an urge" — logs timestamp, increments counter, celebration animation
  - "Log a relapse" — confirmation dialog, resets counter, optional note/trigger input
- **Emergency mode** (full-screen overlay):
  - 4-7-8 breathing animation (inhale 4s, hold 7s, exhale 8s) with visual circle
  - 10 rotating motivational quotes
  - Action checklist: cold water, go for a walk, call someone, do pushups
- **91-day heatmap:** Green = clean, red = relapse, intensity = urges resisted
- **Urge resistance log:** Timeline with timestamps

### 5. Analytics

- **Time filter tabs:** 7d / 30d / 90d / All
- **Habit completion bar chart:** Daily % for selected range
- **Activity heatmap:** GitHub-style 91-day grid, 4 intensity levels
- **Top streaks leaderboard:** All habits ranked by current streak
- **Gym trends:**
  - Progressive overload line chart (select exercise)
  - Total weekly volume bar chart
  - Body measurement trend lines
- **Insights cards:**
  - "Best day: Tuesdays (89% completion)"
  - "Weak spot: Saturdays (28%)"
  - "Gym consistency: 4.2 days/week avg"
  - "Weight trend: +2.1 kg this month"
- **Discipline trend:** Relapse frequency decreasing over time

### 6. Life Trackers (Quick-log section on Dashboard or separate tab)

- **Water intake:** Tap to add a glass, daily target (default 8), visual fill indicator
- **Sleep log:** Hours + quality rating (1-5 stars), bedtime/wake time
- **Mood tracker:** 5-point scale with icons (great/good/okay/bad/terrible) + optional note
- **Reading log:** Minutes today + current book title
- **Finance snapshot:** Monthly view — income, expenses, savings, SIP tracking
- **Daily journal:** Free-text entry, auto-dated, searchable

### 7. Settings

- **Notifications:**
  - Morning reminder (configurable time)
  - Evening check-in (configurable time)
  - Streak milestone alerts (7, 14, 30, 60, 90 days)
  - Gym reminder
  - Discipline danger-hour alert (default 10 PM)
- **Preferences:**
  - Show/hide motivational quotes
  - Haptic feedback toggle
  - Sound effects toggle
  - Default rest timer duration
  - Weight unit (kg/lbs)
- **Data management:**
  - Export all data as JSON
  - Import data from JSON
  - Reset all data (double confirmation)
- **About:** Version, built with info

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | React 18 + TypeScript               |
| Build          | Vite 6                              |
| Styling        | Tailwind CSS 4 (custom theme)       |
| Icons          | Lucide React                        |
| Charts         | Recharts                            |
| Animations     | Framer Motion                       |
| Local DB       | Dexie.js (IndexedDB wrapper)        |
| PWA            | vite-plugin-pwa (Workbox)           |
| Routing        | React Router 7                      |
| State          | React Context + useReducer          |
| Deploy         | Vercel (free tier)                   |

## Data Model (IndexedDB via Dexie)

### habits
```
id: string (uuid)
name: string
icon: string (lucide icon name)
category: 'health' | 'career' | 'mind' | 'discipline' | 'communication' | 'custom'
frequency: { type: 'daily' | 'specific_days' | 'x_per_week', days?: number[], timesPerWeek?: number }
color: 'red' | 'orange' | 'green' | 'blue' | 'yellow'
reminderTime: string | null (HH:mm)
sortOrder: number
createdAt: string (ISO)
```

### completions
```
id: string (uuid)
habitId: string
date: string (YYYY-MM-DD)
completedAt: string (ISO)
notes: string | null
```

### workouts
```
id: string (uuid)
date: string (YYYY-MM-DD)
templateName: string | null
startTime: string (ISO)
endTime: string (ISO) | null
notes: string | null
```

### exerciseSets
```
id: string (uuid)
workoutId: string
exerciseName: string
muscleGroup: string
setNumber: number
reps: number
weight: number (kg)
isPersonalRecord: boolean
```

### exerciseLibrary
```
id: string (uuid)
name: string
muscleGroup: string
isCustom: boolean
```

### bodyStats
```
id: string (uuid)
date: string (YYYY-MM-DD)
weight: number | null
chest: number | null
arms: number | null
waist: number | null
bodyFat: number | null
```

### disciplineLog
```
id: string (uuid)
type: 'clean' | 'urge_resisted' | 'relapse'
date: string (YYYY-MM-DD)
time: string (ISO)
notes: string | null
trigger: string | null
```

### moodLog
```
id: string (uuid)
date: string (YYYY-MM-DD)
mood: 1 | 2 | 3 | 4 | 5
energy: 1 | 2 | 3 | 4 | 5
note: string | null
```

### waterLog
```
id: string (uuid)
date: string (YYYY-MM-DD)
glasses: number
target: number
```

### sleepLog
```
id: string (uuid)
date: string (YYYY-MM-DD)
hours: number
quality: 1 | 2 | 3 | 4 | 5
bedtime: string (HH:mm)
wakeTime: string (HH:mm)
```

### journal
```
id: string (uuid)
date: string (YYYY-MM-DD)
text: string
createdAt: string (ISO)
```

### settings
```
key: string
value: any (JSON)
```

## PWA Configuration

- `manifest.json`: name "HabitFlow", theme_color `#FF2D55`, background_color `#000000`
- Icons: 192x192 and 512x512 PNG (red on black)
- Service worker: cache-first for assets, network-first for data
- Offline support: full functionality (all data in IndexedDB)
- Install prompt: custom "Add to Home Screen" banner

## Project Structure

```
src/
  components/
    ui/              # Button, Card, Modal, Toggle, Input, etc.
    charts/          # ActivityRings, BarChart, Heatmap, LineChart
    layout/          # BottomNav, Header, PageContainer
  pages/
    Dashboard.tsx
    Habits.tsx
    GymTracker.tsx
    Analytics.tsx
    Settings.tsx
    DisciplineTracker.tsx
  hooks/
    useHabits.ts
    useWorkouts.ts
    useDiscipline.ts
    useBodyStats.ts
    useLifeTrackers.ts
  db/
    database.ts       # Dexie schema + instance
    seed.ts           # Default exercises, templates
  utils/
    dates.ts
    calculations.ts   # Streaks, averages, PRs
  types/
    index.ts
  App.tsx
  main.tsx
  index.css           # Tailwind + custom theme
public/
  manifest.json
  sw.js
  icons/
```

## Non-Goals (Out of scope for v1)

- User authentication / multi-user
- Cloud sync (Supabase) — future v2
- Progress photos
- Social features
- AI insights
- Nutrition macro tracking (beyond protein target)
