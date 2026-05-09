import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Play, Upload, User, LogOut, Search, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';

export const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-white text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Antigravity<span className="text-primary">Stream</span></span>
        </Link>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search videos..." 
            className="w-full bg-secondary border border-white/5 rounded-full py-2 pl-10 pr-4 outline-none focus:border-primary/30 transition-all text-sm"
          />
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/health" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mr-2">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="text-sm font-medium">Health</span>
              </Link>
              <Link to="/upload" className="btn-primary py-1.5 px-4 text-sm hidden sm:flex">
                <Upload className="w-4 h-4" />
                Upload
              </Link>
              <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                <div className="flex flex-col items-end hidden xs:block">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Creator</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-primary transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary py-1.5 px-5 text-sm">Login</Link>
              <Link to="/register" className="btn-primary py-1.5 px-5 text-sm">Join</Link>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile Nav (Stub) */}
      <div className="md:hidden sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex items-center justify-around">
          <Link to="/" className="text-white/60 hover:text-white transition-colors flex flex-col items-center gap-1">
            <Play className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </Link>
          <Link to="/upload" className="text-white/60 hover:text-white transition-colors flex flex-col items-center gap-1">
            <Upload className="w-5 h-5" />
            <span className="text-[10px]">Upload</span>
          </Link>
          <Link to="/profile" className="text-white/60 hover:text-white transition-colors flex flex-col items-center gap-1">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </Link>
      </div>
    </div>
  );
};
