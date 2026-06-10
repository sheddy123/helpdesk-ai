import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, Inbox, Users, LogOut, Sun, Moon } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tickets', label: 'Tickets', icon: Inbox },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
    isActive
      ? 'bg-primary/10 text-primary font-semibold'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.roles.includes('Admin');
  const initial = user?.userName?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-58 flex-col border-r border-border bg-card" style={{ width: '232px' }}>
        {/* Logo + toggle */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span className="font-serif text-base font-semibold italic text-foreground tracking-tight">
              Helpdesk
            </span>
            <span className="font-serif text-base font-semibold italic text-primary tracking-tight">
              AI
            </span>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/users" className={navClass}>
              <Users className="h-4 w-4 shrink-0" />
              Users
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user?.userName}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                {isAdmin ? 'Admin' : 'Agent'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col" style={{ marginLeft: '232px' }}>
        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
