import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Habits } from './pages/Habits';
import { GymTracker } from './pages/GymTracker';
import { DisciplineTracker } from './pages/DisciplineTracker';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { seedDatabase } from './db/seed';

export default function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/gym" element={<GymTracker />} />
          <Route path="/discipline" element={<DisciplineTracker />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
