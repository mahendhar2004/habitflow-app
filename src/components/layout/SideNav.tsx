import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ListChecks, Dumbbell, BarChart3, Settings, Flame, Activity } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/habits', icon: ListChecks, label: 'Habits' },
  { path: '/gym', icon: Dumbbell, label: 'Gym' },
  { path: '/discipline', icon: Flame, label: 'Discipline' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-[220px] bg-surface border-r border-border h-screen sticky top-0 p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Activity size={24} className="text-red" />
        <span className="text-lg font-bold">HabitFlow</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-red/10 text-red' : 'text-text-2 hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
