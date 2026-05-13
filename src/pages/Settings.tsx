import { useState, useCallback, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import {
  Droplets,
  Moon,
  SmilePlus,
  BookOpen,
  Star,
  Minus,
  Plus,
  Frown,
  Meh,
  Smile,
  Laugh,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings2,
  Database,
  Info,
  Download,
  Upload,
  Trash2,
  Timer,
  Weight,
  Quote,
  Sunrise,
  Sunset,
  Dumbbell,
  Trophy,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  User,
  Smartphone,
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/Input';
import { PageContainer } from '../components/layout/PageContainer';
import { db } from '../db/database';
import { today } from '../utils/dates';
import { useAuth } from '../contexts/AuthContext';
import { syncAll, pushToSupabase, pullFromSupabase } from '../lib/sync';
import { useNavigate } from 'react-router-dom';
import type { MoodLog, SleepLog, WaterLog, JournalEntry } from '../types';

// ---------------------------------------------------------------------------
// LocalStorage helpers for settings persistence
// ---------------------------------------------------------------------------
function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveSetting<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Mood icons mapping
// ---------------------------------------------------------------------------
const MOOD_ICONS = [
  { level: 1 as const, Icon: Frown, label: 'Terrible' },
  { level: 2 as const, Icon: Meh, label: 'Bad' },
  { level: 3 as const, Icon: Smile, label: 'Okay' },
  { level: 4 as const, Icon: SmilePlus, label: 'Good' },
  { level: 5 as const, Icon: Laugh, label: 'Great' },
];

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------
// Store the deferred install prompt globally so it survives re-renders
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function SettingsPage() {
  const todayStr = today();
  const { user, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [canInstall, setCanInstall] = useState(!!deferredInstallPrompt);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    }
    function handleAppInstalled() {
      deferredInstallPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    }
  }, []);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState('');

  const handleSync = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setSyncStatus('idle');
    const result = await syncAll(user.id);
    setSyncing(false);
    if (result.success) {
      setSyncStatus('success');
    } else {
      setSyncStatus('error');
      setSyncError(result.error || 'Sync failed');
    }
    setTimeout(() => setSyncStatus('idle'), 3000);
  }, [user]);

  const handlePush = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    const result = await pushToSupabase(user.id);
    setSyncing(false);
    if (result.success) setSyncStatus('success');
    else { setSyncStatus('error'); setSyncError(result.error || 'Push failed'); }
    setTimeout(() => setSyncStatus('idle'), 3000);
  }, [user]);

  const handlePull = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    const result = await pullFromSupabase(user.id);
    setSyncing(false);
    if (result.success) setSyncStatus('success');
    else { setSyncStatus('error'); setSyncError(result.error || 'Pull failed'); }
    setTimeout(() => setSyncStatus('idle'), 3000);
  }, [user]);

  // --- Expand states for collapsible sections ---
  const [sleepOpen, setSleepOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  // --- Reset confirmation state ---
  const [resetStep, setResetStep] = useState<0 | 1>(0);

  // --- Import modal ---
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Sleep form local state ---
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sleepBedtime, setSleepBedtime] = useState('');
  const [sleepWakeTime, setSleepWakeTime] = useState('');

  // --- Mood note ---
  const [moodNote, setMoodNote] = useState('');

  // --- Journal text ---
  const [journalText, setJournalText] = useState('');

  // --- Notification settings (localStorage) ---
  const [morningReminder, setMorningReminder] = useState(() => loadSetting('hf_morning_reminder', false));
  const [morningTime, setMorningTime] = useState(() => loadSetting('hf_morning_time', '07:00'));
  const [eveningCheckin, setEveningCheckin] = useState(() => loadSetting('hf_evening_checkin', false));
  const [eveningTime, setEveningTime] = useState(() => loadSetting('hf_evening_time', '21:00'));
  const [streakAlerts, setStreakAlerts] = useState(() => loadSetting('hf_streak_alerts', true));
  const [gymReminder, setGymReminder] = useState(() => loadSetting('hf_gym_reminder', false));

  // --- Preferences (localStorage) ---
  const [showQuotes, setShowQuotes] = useState(() => loadSetting('hf_show_quotes', true));
  const [restTimer, setRestTimer] = useState(() => loadSetting('hf_rest_timer', 90));
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(() => loadSetting('hf_weight_unit', 'kg'));

  // --- DB queries ---
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

  const journalEntry = useLiveQuery(
    () => db.journal.where('date').equals(todayStr).first(),
    [todayStr],
  );

  // ---------------------------------------------------------------------------
  // Water handlers
  // ---------------------------------------------------------------------------
  const waterGlasses = waterLog?.glasses ?? 0;
  const waterTarget = waterLog?.target ?? 8;

  const updateWater = useCallback(
    async (delta: number) => {
      const newCount = Math.max(0, waterGlasses + delta);
      if (waterLog) {
        await db.waterLog.update(waterLog.id, { glasses: newCount });
      } else {
        const entry: WaterLog = {
          id: uuid(),
          date: todayStr,
          glasses: newCount,
          target: 8,
        };
        await db.waterLog.add(entry);
      }
    },
    [waterLog, waterGlasses, todayStr],
  );

  // ---------------------------------------------------------------------------
  // Sleep handler
  // ---------------------------------------------------------------------------
  const saveSleep = useCallback(async () => {
    const hours = parseFloat(sleepHours);
    if (isNaN(hours) || hours <= 0) return;

    const entry: SleepLog = {
      id: sleepLog?.id ?? uuid(),
      date: todayStr,
      hours,
      quality: sleepQuality,
      bedtime: sleepBedtime || '23:00',
      wakeTime: sleepWakeTime || '07:00',
    };

    if (sleepLog) {
      await db.sleepLog.update(sleepLog.id, entry);
    } else {
      await db.sleepLog.add(entry);
    }
    setSleepOpen(false);
  }, [sleepHours, sleepQuality, sleepBedtime, sleepWakeTime, sleepLog, todayStr]);

  // ---------------------------------------------------------------------------
  // Mood handler
  // ---------------------------------------------------------------------------
  const saveMood = useCallback(
    async (level: 1 | 2 | 3 | 4 | 5) => {
      const entry: MoodLog = {
        id: moodLog?.id ?? uuid(),
        date: todayStr,
        mood: level,
        energy: level,
        note: moodNote || null,
      };

      if (moodLog) {
        await db.moodLog.update(moodLog.id, entry);
      } else {
        await db.moodLog.add(entry);
      }
    },
    [moodLog, todayStr, moodNote],
  );

  // ---------------------------------------------------------------------------
  // Journal handler
  // ---------------------------------------------------------------------------
  const saveJournal = useCallback(async () => {
    if (!journalText.trim()) return;

    const entry: JournalEntry = {
      id: journalEntry?.id ?? uuid(),
      date: todayStr,
      text: journalText.trim(),
      createdAt: journalEntry?.createdAt ?? new Date().toISOString(),
    };

    if (journalEntry) {
      await db.journal.update(journalEntry.id, entry);
    } else {
      await db.journal.add(entry);
    }
    setJournalOpen(false);
  }, [journalText, journalEntry, todayStr]);

  // ---------------------------------------------------------------------------
  // Notification setting helpers
  // ---------------------------------------------------------------------------
  const toggleNotification = useCallback(
    (key: string, setter: (v: boolean) => void, value: boolean) => {
      setter(value);
      saveSetting(key, value);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Export data
  // ---------------------------------------------------------------------------
  const exportData = useCallback(async () => {
    const data = {
      habits: await db.habits.toArray(),
      completions: await db.completions.toArray(),
      workouts: await db.workouts.toArray(),
      exerciseSets: await db.exerciseSets.toArray(),
      bodyStats: await db.bodyStats.toArray(),
      disciplineLog: await db.disciplineLog.toArray(),
      moodLog: await db.moodLog.toArray(),
      waterLog: await db.waterLog.toArray(),
      sleepLog: await db.sleepLog.toArray(),
      journal: await db.journal.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitflow-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ---------------------------------------------------------------------------
  // Import data
  // ---------------------------------------------------------------------------
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as Record<string, unknown[]>;

      const tableMap: Record<string, ReturnType<typeof db.table>> = {
        habits: db.habits,
        completions: db.completions,
        workouts: db.workouts,
        exerciseSets: db.exerciseSets,
        bodyStats: db.bodyStats,
        disciplineLog: db.disciplineLog,
        moodLog: db.moodLog,
        waterLog: db.waterLog,
        sleepLog: db.sleepLog,
        journal: db.journal,
      };

      for (const [key, table] of Object.entries(tableMap)) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          await table.bulkPut(data[key] as never[]);
        }
      }

      setImportStatus('success');
    } catch {
      setImportStatus('error');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ---------------------------------------------------------------------------
  // Reset all data
  // ---------------------------------------------------------------------------
  const handleReset = useCallback(async () => {
    if (resetStep === 0) {
      setResetStep(1);
      return;
    }
    await db.delete();
    await db.open();
    setResetStep(0);
  }, [resetStep]);

  // --- Populate sleep form when data loads ---
  const sleepFormPopulated = useRef(false);
  if (sleepLog && !sleepFormPopulated.current) {
    setSleepHours(String(sleepLog.hours));
    setSleepQuality(sleepLog.quality);
    setSleepBedtime(sleepLog.bedtime);
    setSleepWakeTime(sleepLog.wakeTime);
    sleepFormPopulated.current = true;
  }

  // --- Populate journal text when data loads ---
  const journalPopulated = useRef(false);
  if (journalEntry && !journalPopulated.current) {
    setJournalText(journalEntry.text);
    journalPopulated.current = true;
  }

  // --- Populate mood note when data loads ---
  const moodPopulated = useRef(false);
  if (moodLog && !moodPopulated.current) {
    setMoodNote(moodLog.note ?? '');
    moodPopulated.current = true;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageContainer title="Settings" subtitle="Quick logs, preferences & data">
      <div className="space-y-6">
        {/* ================================================================= */}
        {/* ACCOUNT & SYNC                                                     */}
        {/* ================================================================= */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="h-4 w-4 text-text-2" />
            <h2 className="text-base font-semibold text-text">Account & Sync</h2>
          </div>

          {user ? (
            <Card className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-red/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{user.email}</p>
                  <p className="text-[11px] text-text-3">Signed in</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
                <Button variant="secondary" size="sm" onClick={handlePush} disabled={syncing}>
                  <Upload className="h-3.5 w-3.5" />
                  Push
                </Button>
                <Button variant="secondary" size="sm" onClick={handlePull} disabled={syncing}>
                  <Download className="h-3.5 w-3.5" />
                  Pull
                </Button>
              </div>

              {syncStatus === 'success' && (
                <p className="text-xs text-green text-center">Synced successfully</p>
              )}
              {syncStatus === 'error' && (
                <p className="text-xs text-red text-center">{syncError}</p>
              )}

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={async () => { await signOut(); }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </Card>
          ) : (
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-surface-2 flex items-center justify-center">
                  <CloudOff className="h-5 w-5 text-text-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Offline Mode</p>
                  <p className="text-[11px] text-text-3">
                    {isConfigured ? 'Sign in to sync across devices' : 'Supabase not configured'}
                  </p>
                </div>
              </div>
              {isConfigured && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  className="mt-3"
                  onClick={() => navigate('/auth')}
                >
                  <User className="h-4 w-4" />
                  Sign In / Sign Up
                </Button>
              )}
            </Card>
          )}
        </section>

        {/* ================================================================= */}
        {/* QUICK LIFE LOGGING                                                 */}
        {/* ================================================================= */}
        <section>
          <h2 className="text-base font-semibold text-text mb-3">Quick Life Log</h2>
          <div className="space-y-2">
            {/* --- Water Intake --- */}
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Droplets className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Water</p>
                  <p className="text-[11px] text-text-3">
                    {waterGlasses} / {waterTarget} glasses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateWater(-1)}
                    disabled={waterGlasses <= 0}
                    className="h-8 w-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-2 hover:bg-surface-3 disabled:opacity-30 transition-colors"
                    aria-label="Decrease water"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-bold text-text w-6 text-center tabular-nums">
                    {waterGlasses}
                  </span>
                  <button
                    onClick={() => updateWater(1)}
                    className="h-8 w-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-2 hover:bg-surface-3 transition-colors"
                    aria-label="Increase water"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Water progress dots */}
              <div className="flex items-center gap-1.5 mt-3">
                {Array.from({ length: waterTarget }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < waterGlasses ? 'bg-blue-400' : 'bg-surface-2'
                    }`}
                  />
                ))}
              </div>
            </Card>

            {/* --- Sleep Log --- */}
            <Card>
              <button
                onClick={() => setSleepOpen(!sleepOpen)}
                className="flex items-center gap-3 w-full text-left"
                aria-label="Toggle sleep log"
              >
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Moon className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Sleep</p>
                  <p className="text-[11px] text-text-3">
                    {sleepLog
                      ? `${sleepLog.hours}h -- Quality ${sleepLog.quality}/5`
                      : 'Tap to log sleep'}
                  </p>
                </div>
                {sleepOpen ? (
                  <ChevronUp className="h-4 w-4 text-text-3 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-3 shrink-0" />
                )}
              </button>

              {sleepOpen && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <Input
                    label="Hours slept"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    placeholder="7.5"
                  />
                  {/* Quality stars */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-2 uppercase tracking-wider">
                      Quality
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setSleepQuality(n as 1 | 2 | 3 | 4 | 5)}
                          className="p-1"
                          aria-label={`Set sleep quality to ${n}`}
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              n <= sleepQuality
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-text-3'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Bedtime"
                      type="time"
                      value={sleepBedtime}
                      onChange={(e) => setSleepBedtime(e.target.value)}
                    />
                    <Input
                      label="Wake time"
                      type="time"
                      value={sleepWakeTime}
                      onChange={(e) => setSleepWakeTime(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={saveSleep} fullWidth>
                    {sleepLog ? 'Update Sleep' : 'Save Sleep'}
                  </Button>
                </div>
              )}
            </Card>

            {/* --- Mood --- */}
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                  <SmilePlus className="h-5 w-5 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Mood</p>
                  <p className="text-[11px] text-text-3">
                    {moodLog
                      ? MOOD_ICONS.find((m) => m.level === moodLog.mood)?.label ?? 'Logged'
                      : 'How are you feeling?'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 px-2">
                {MOOD_ICONS.map(({ level, Icon, label }) => (
                  <button
                    key={level}
                    onClick={() => saveMood(level)}
                    className="flex flex-col items-center gap-1 group"
                    aria-label={`Set mood to ${label}`}
                  >
                    <Icon
                      className={`h-7 w-7 transition-all ${
                        moodLog?.mood === level
                          ? 'text-red scale-110'
                          : 'text-text-3 group-hover:text-text-2'
                      }`}
                    />
                    <span
                      className={`text-[10px] ${
                        moodLog?.mood === level ? 'text-red font-medium' : 'text-text-3'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Mood note */}
              <div className="mt-3">
                <Input
                  placeholder="Add a note (optional)"
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  onBlur={() => {
                    if (moodLog && moodNote !== (moodLog.note ?? '')) {
                      saveMood(moodLog.mood);
                    }
                  }}
                />
              </div>
            </Card>

            {/* --- Journal --- */}
            <Card>
              <button
                onClick={() => setJournalOpen(!journalOpen)}
                className="flex items-center gap-3 w-full text-left"
                aria-label="Toggle journal"
              >
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Journal</p>
                  <p className="text-[11px] text-text-3">
                    {journalEntry
                      ? `${journalEntry.text.slice(0, 40)}${journalEntry.text.length > 40 ? '...' : ''}`
                      : 'Tap to write'}
                  </p>
                </div>
                {journalOpen ? (
                  <ChevronUp className="h-4 w-4 text-text-3 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-3 shrink-0" />
                )}
              </button>

              {journalOpen && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <TextArea
                    label="Today's thoughts"
                    rows={5}
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Write about your day..."
                  />
                  <Button size="sm" onClick={saveJournal} fullWidth>
                    {journalEntry ? 'Update Journal' : 'Save Journal'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* ================================================================= */}
        {/* NOTIFICATION SETTINGS                                              */}
        {/* ================================================================= */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-text-2" />
            <h2 className="text-base font-semibold text-text">Notifications</h2>
          </div>
          <Card className="space-y-4">
            {/* Morning reminder */}
            <div className="flex items-center gap-3">
              <Sunrise className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Morning reminder</p>
              </div>
              {morningReminder && (
                <input
                  type="time"
                  value={morningTime}
                  onChange={(e) => {
                    setMorningTime(e.target.value);
                    saveSetting('hf_morning_time', e.target.value);
                  }}
                  className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text focus:outline-none focus:border-red/50"
                />
              )}
              <Toggle
                checked={morningReminder}
                onChange={(v) => toggleNotification('hf_morning_reminder', setMorningReminder, v)}
              />
            </div>

            {/* Evening check-in */}
            <div className="flex items-center gap-3">
              <Sunset className="h-4 w-4 text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Evening check-in</p>
              </div>
              {eveningCheckin && (
                <input
                  type="time"
                  value={eveningTime}
                  onChange={(e) => {
                    setEveningTime(e.target.value);
                    saveSetting('hf_evening_time', e.target.value);
                  }}
                  className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text focus:outline-none focus:border-red/50"
                />
              )}
              <Toggle
                checked={eveningCheckin}
                onChange={(v) => toggleNotification('hf_evening_checkin', setEveningCheckin, v)}
              />
            </div>

            {/* Streak milestones */}
            <div className="flex items-center gap-3">
              <Trophy className="h-4 w-4 text-yellow-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Streak milestone alerts</p>
              </div>
              <Toggle
                checked={streakAlerts}
                onChange={(v) => toggleNotification('hf_streak_alerts', setStreakAlerts, v)}
              />
            </div>

            {/* Gym reminder */}
            <div className="flex items-center gap-3">
              <Dumbbell className="h-4 w-4 text-orange shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Gym reminder</p>
              </div>
              <Toggle
                checked={gymReminder}
                onChange={(v) => toggleNotification('hf_gym_reminder', setGymReminder, v)}
              />
            </div>
          </Card>
        </section>

        {/* ================================================================= */}
        {/* PREFERENCES                                                        */}
        {/* ================================================================= */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-text-2" />
            <h2 className="text-base font-semibold text-text">Preferences</h2>
          </div>
          <Card className="space-y-4">
            {/* Motivational quotes */}
            <div className="flex items-center gap-3">
              <Quote className="h-4 w-4 text-red shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Show motivational quotes</p>
              </div>
              <Toggle
                checked={showQuotes}
                onChange={(v) => {
                  setShowQuotes(v);
                  saveSetting('hf_show_quotes', v);
                }}
              />
            </div>

            {/* Rest timer */}
            <div className="flex items-center gap-3">
              <Timer className="h-4 w-4 text-green shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Rest timer (seconds)</p>
              </div>
              <input
                type="number"
                min="10"
                max="600"
                step="5"
                value={restTimer}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setRestTimer(val);
                    saveSetting('hf_rest_timer', val);
                  }
                }}
                className="w-20 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-text text-center focus:outline-none focus:border-red/50"
              />
            </div>

            {/* Weight unit */}
            <div className="flex items-center gap-3">
              <Weight className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">Weight unit</p>
              </div>
              <div className="flex items-center bg-surface-2 rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => {
                    setWeightUnit('kg');
                    saveSetting('hf_weight_unit', 'kg');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    weightUnit === 'kg'
                      ? 'bg-red text-white'
                      : 'text-text-2 hover:text-text'
                  }`}
                >
                  kg
                </button>
                <button
                  onClick={() => {
                    setWeightUnit('lbs');
                    saveSetting('hf_weight_unit', 'lbs');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    weightUnit === 'lbs'
                      ? 'bg-red text-white'
                      : 'text-text-2 hover:text-text'
                  }`}
                >
                  lbs
                </button>
              </div>
            </div>
          </Card>
        </section>

        {/* ================================================================= */}
        {/* DATA MANAGEMENT                                                    */}
        {/* ================================================================= */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-text-2" />
            <h2 className="text-base font-semibold text-text">Data Management</h2>
          </div>
          <Card className="space-y-3">
            <Button variant="secondary" fullWidth onClick={exportData}>
              <Download className="h-4 w-4" />
              Export All Data
            </Button>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setImportStatus('idle');
                setImportModalOpen(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Import Data
            </Button>

            <Button
              variant="danger"
              fullWidth
              onClick={handleReset}
            >
              <Trash2 className="h-4 w-4" />
              {resetStep === 0 ? 'Reset All Data' : 'Tap again to confirm reset'}
            </Button>

            {resetStep === 1 && (
              <p className="text-xs text-red text-center">
                This will permanently delete all your data. Tap again to confirm, or wait to cancel.
              </p>
            )}
          </Card>
        </section>

        {/* ================================================================= */}
        {/* INSTALL APP                                                        */}
        {/* ================================================================= */}
        {!isInstalled && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-text-2" />
              <h2 className="text-base font-semibold text-text">Install App</h2>
            </div>
            <Card glow="red">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-red/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-red" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">Install HabitFlow</p>
                  <p className="text-[11px] text-text-2">
                    Add to your home screen for a full app experience — no browser bar, works offline
                  </p>
                </div>
              </div>
              {canInstall ? (
                <Button fullWidth onClick={handleInstall}>
                  <Smartphone className="h-4 w-4" />
                  Install App
                </Button>
              ) : (
                <div className="bg-surface-2 rounded-xl p-3 text-xs text-text-2 space-y-1.5">
                  <p className="font-medium text-text text-sm">How to install:</p>
                  <p>1. Open this page in <strong className="text-text">Chrome</strong> on your phone</p>
                  <p>2. Tap the <strong className="text-text">three-dot menu</strong> (top right)</p>
                  <p>3. Tap <strong className="text-text">"Install app"</strong> or <strong className="text-text">"Add to Home Screen"</strong></p>
                </div>
              )}
            </Card>
          </section>
        )}

        {isInstalled && (
          <section>
            <Card>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-green/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">App Installed</p>
                  <p className="text-[11px] text-text-3">Running as standalone app</p>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* ================================================================= */}
        {/* ABOUT                                                              */}
        {/* ================================================================= */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-text-2" />
            <h2 className="text-base font-semibold text-text">About</h2>
          </div>
          <Card>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-text">HabitFlow</p>
              <p className="text-sm text-text-2">Version 1.0.0</p>
              <p className="text-xs text-text-3 mt-2">Built with React + Dexie + Tailwind</p>
            </div>
          </Card>
        </section>
      </div>

      {/* =================================================================== */}
      {/* IMPORT MODAL                                                         */}
      {/* =================================================================== */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Data"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-2">
            Select a previously exported HabitFlow JSON backup file. Existing records with matching
            IDs will be overwritten.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="block w-full text-sm text-text-2 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-red file:text-white hover:file:brightness-110 file:cursor-pointer file:transition-all"
          />

          {importStatus === 'success' && (
            <p className="text-sm text-green font-medium">Data imported successfully.</p>
          )}
          {importStatus === 'error' && (
            <p className="text-sm text-red font-medium">
              Import failed. Please check the file format.
            </p>
          )}

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setImportModalOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
