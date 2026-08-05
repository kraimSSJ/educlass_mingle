import { NavLink } from 'react-router-dom';
import { BookOpen, Timer, NotebookPen, Users, Image, DoorOpen, Coins, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';

const links = [
  { to: '/', label: 'Solo Study', icon: BookOpen },
  { to: '/pomodoro', label: 'Pomodoro', icon: Timer },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/rooms', label: 'Group Study', icon: Users },
  { to: '/social', label: 'Social', icon: Image },
  { to: '/profile', label: 'Profile Room', icon: DoorOpen },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 min-w-64 max-w-64 shrink-0 overflow-y-auto border-r border-ink/10 bg-white/60 p-6 md:flex md:flex-col">
        <div className="mb-10 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-clay" strokeWidth={2} />
          <span className="font-display text-lg font-semibold tracking-tight">EduClass Mingle</span>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-moss/10 text-moss' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-gold/15 px-3 py-2 text-sm font-medium text-gold">
            <Coins className="h-4 w-4" strokeWidth={2} />
            <span id="coin-balance">Coins</span>
          </div>

          <div className="rounded-lg border border-ink/10 px-3 py-2">
            <p className="text-xs text-ink/40">Signed in as</p>
            <p className="text-sm font-medium text-ink truncate">{user?.username}</p>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink/60 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink/10 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(16,69,75,0.08)] backdrop-blur md:hidden">
        <div className="grid grid-cols-6 gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-label={label}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors ${
                  isActive ? 'bg-moss/10 text-moss' : 'text-ink/55'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="max-w-full truncate">{label.replace(' Study', '').replace(' Room', '')}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
