import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home, User, LogOut, ChevronDown, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, households, currentHousehold, viewMode, setViewMode, switchHousehold, logout, switchDemoUser } = useAuth();

  const demoUsers = [
    { email: 'mitesh@pfinanc.local', label: 'Mitesh (Owner)', role: 'OWNER' },
    { email: 'father@pfinanc.local', label: 'Father (Admin)', role: 'ADMIN' },
    { email: 'mother@pfinanc.local', label: 'Mother (Member)', role: 'MEMBER' },
  ];

  return (
    <header className="h-16 bg-[#0d1322]/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between z-10 sticky top-0">
      {/* Left: Household selector & View Switcher */}
      <div className="flex items-center gap-4">
        {/* Household Dropdown */}
        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-sm">
          <Home className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">{currentHousehold?.name || 'Vasoya Family'}</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {currentHousehold?.role || 'OWNER'}
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('household')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'household'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Household View
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'personal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Personal View
          </button>
        </div>
      </div>

      {/* Right: Demo User Switcher & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60 text-xs">
          <div className="flex items-center gap-1 px-2 text-slate-400 font-medium text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch Role:</span>
          </div>
          {demoUsers.map((du) => {
            const isCurrent = user?.email === du.email;
            return (
              <button
                key={du.email}
                onClick={() => switchDemoUser(du.email)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  isCurrent
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {du.label}
              </button>
            );
          })}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
          </div>
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
            alt={user?.name || 'Avatar'}
            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
          />
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
