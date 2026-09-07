import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home, User, LogOut, ChevronDown, Sparkles, Bell, BotMessageSquare, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';

export const Header: React.FC = () => {
  const { user, households, currentHousehold, viewMode, setViewMode, switchHousehold, logout, switchDemoUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.getAIAdvisorNotifications();
      if (res.success && res.data) setNotifications(res.data);
    };
    load();
    const interval = setInterval(load, 60000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    await api.markAIAdvisorNotificationsRead();
    setNotifications([]);
    setShowNotifDropdown(false);
  };

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

        {/* Notification Bell + User Card */}
        <div className="flex items-center gap-3">
          {/* AI Advisor Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="ai-advisor-notification-bell"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              title="AI Advisor Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BotMessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">AI Advisor</span>
                    {notifications.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {notifications.length} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">
                      <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p>No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <Link
                        key={n.id}
                        href={n.report_id ? `/ai-advisor?report=${n.report_id}` : '/ai-advisor'}
                        onClick={() => setShowNotifDropdown(false)}
                        className="block px-4 py-3 hover:bg-slate-800/50 transition-colors"
                      >
                        <p className="text-xs font-semibold text-slate-200 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </Link>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-800 text-center">
                  <Link href="/ai-advisor" onClick={() => setShowNotifDropdown(false)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                    Open AI Advisor →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Demo Switcher */}
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
