import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Habits } from './pages/Habits';
import { GymTracker } from './pages/GymTracker';
import { DisciplineTracker } from './pages/DisciplineTracker';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { AuthPage } from './pages/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { seedDatabase } from './db/seed';
import { syncAll } from './lib/sync';

function AppRoutes() {
  const { user, loading } = useAuth();

  useEffect(() => {
    seedDatabase();
  }, []);

  // Auto-sync when user logs in
  useEffect(() => {
    if (user) {
      syncAll(user.id).then((result) => {
        if (!result.success) console.error('Auto-sync failed:', result.error);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red/30 border-t-red rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/gym" element={<GymTracker />} />
        <Route path="/discipline" element={<DisciplineTracker />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
