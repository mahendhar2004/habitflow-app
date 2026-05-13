import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ListChecks, Dumbbell, BarChart3, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/habits', icon: ListChecks, label: 'Habits' },
  { path: '/gym', icon: Dumbbell, label: 'Gym' },
  { path: '/analytics', icon: BarChart3, label: 'Stats' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-border z-50 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors ${
                active ? 'text-red' : 'text-text-3'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
