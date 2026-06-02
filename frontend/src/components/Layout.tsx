import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Upload,
  LogOut,
  Search,
  Activity,
  Home,
  User,
  Play,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import { cn } from '../lib/utils.ts';

/**
 * StreamFlix brand mark — small icon + wordmark.
 * Used in the header and (as compact) elsewhere.
 */
const Brand: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <Link to="/" className="flex items-center gap-2.5 group">
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-primary">
      <Play className="h-4 w-4 fill-white text-white translate-x-[1px]" />
    </span>
    {!compact && (
      <span className="text-xl font-display font-bold tracking-tight">
        Stream<span className="text-brand-gradient">Flix</span>
      </span>
    )}
  </Link>
);

export const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {/* ── Top header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Brand />

          {/* Primary nav (desktop) */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-white bg-white/5'
                    : 'text-muted hover:text-white',
                )
              }
            >
              Discover
            </NavLink>
            <NavLink
              to="/health"
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'text-white bg-white/5'
                    : 'text-muted hover:text-white',
                )
              }
            >
              <Activity className="h-3.5 w-3.5 text-ok" />
              Cluster
            </NavLink>
          </nav>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md mx-4 relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos, creators, hashtags…"
              className="w-full bg-surface-1 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm outline-none focus:border-primary/40 focus:bg-surface-2 transition-all placeholder:text-white/30"
            />
          </form>

          {/* Auth-aware right cluster */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  to="/upload"
                  className="btn-primary py-1.5 px-3 sm:px-4 text-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload</span>
                </Link>
                <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-white/10">
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-sm font-medium">{user.username}</span>
                    <span className="label-eyebrow text-[9px]">Creator</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-muted hover:text-primary hover:bg-white/5 transition-colors"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="sm:hidden p-2 rounded-full text-muted hover:text-primary hover:bg-white/5"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="btn-ghost text-sm hidden sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary py-1.5 px-4 text-sm"
                >
                  Join free
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ───────────────────────────────────────── */}
      <nav className="md:hidden sticky bottom-0 z-40 bg-background/85 backdrop-blur-xl border-t border-white/5">
        <div className="grid grid-cols-4 px-2 py-2 text-[10px]">
          <MobileNavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" end />
          <MobileNavItem
            to="/health"
            icon={<Activity className="h-5 w-5" />}
            label="Cluster"
          />
          <MobileNavItem
            to="/upload"
            icon={<Upload className="h-5 w-5" />}
            label="Upload"
          />
          <MobileNavItem
            to={user ? '/' : '/login'}
            icon={<User className="h-5 w-5" />}
            label={user ? user.username : 'Sign in'}
          />
        </div>
      </nav>
    </div>
  );
};

const MobileNavItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}> = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors',
        isActive ? 'text-white' : 'text-muted hover:text-white',
      )
    }
  >
    {icon}
    <span className="font-medium truncate max-w-[68px]">{label}</span>
  </NavLink>
);
