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
    <header className="h-[72px] bg-[#090d16]/80 backdrop-blur-xl border-b border-slate-800/60 px-6 flex items-center justify-between z-30 sticky top-0 transition-all duration-300">
      {/* Dynamic Header Glow */}
      <div className="absolute top-0 left-1/4 w-1/2 h-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Left: Household selector & View Switcher */}
      <div className="flex items-center gap-6 relative z-10">
        {/* Household Dropdown - Premium Glass Pill */}
        <button className="group relative flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/40 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]">
          <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
            <Home className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Household</span>
            <span className="text-sm font-black text-white">{currentHousehold?.name || 'Vasoya Family'}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors ml-2" />
        </button>

        {/* View Toggle - Animated Segmented Control */}
        <div className="hidden md:flex items-center bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 relative">
          <button
            onClick={() => setViewMode('household')}
            className={`relative z-10 px-4 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
              viewMode === 'household'
                ? 'text-white drop-shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Household
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`relative z-10 px-4 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
              viewMode === 'personal'
                ? 'text-white drop-shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Personal
          </button>
          {/* Animated Background Indicator */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-600 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              viewMode === 'household' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />
        </div>
      </div>

      {/* Right: Notifications + Demo + Profile */}
      <div className="flex items-center gap-4 relative z-10">
        
        {/* Demo Switcher */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-900/40 p-1 rounded-xl border border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 px-3 border-r border-slate-700/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Demo</span>
          </div>
          {demoUsers.map((du) => {
            const isCurrent = user?.email === du.email;
            return (
              <button
                key={du.email}
                onClick={() => switchDemoUser(du.email)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/30 font-bold shadow-[0_0_10px_-2px_rgba(245,158,11,0.2)]'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300 font-semibold border border-transparent'
                }`}
              >
                {du.label.split(' ')[0]}
              </button>
            );
          })}
        </div>

        <div className="h-8 w-px bg-slate-800/80 mx-1 hidden lg:block" />

        {/* AI Advisor Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="ai-advisor-notification-bell"
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className={`relative p-2.5 rounded-xl transition-all duration-300 ${
              showNotifDropdown ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]' : 'bg-slate-900/50 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 border border-transparent hover:border-slate-700'
            }`}
            title="AI Advisor Notifications"
          >
            <Bell className={`w-5 h-5 ${notifications.length > 0 ? 'animate-[swing_2s_ease-in-out_infinite]' : ''}`} />
            {notifications.length > 0 && (
              <>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-[#090d16] rounded-full z-10" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping opacity-75" />
              </>
            )}
          </button>

          <style jsx>{`
            @keyframes swing {
              0% { transform: rotate(0deg); }
              10% { transform: rotate(15deg); }
              20% { transform: rotate(-10deg); }
              30% { transform: rotate(5deg); }
              40% { transform: rotate(-5deg); }
              50% { transform: rotate(0deg); }
              100% { transform: rotate(0deg); }
            }
          `}</style>

          {showNotifDropdown && (
            <div className="absolute right-0 top-14 w-80 bg-[#090d16]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                    <BotMessageSquare className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-sm font-bold text-white tracking-tight">AI Advisor</span>
                </div>
                {notifications.length > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 hover:bg-slate-800">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark Read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-500 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                      <Bell className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="font-semibold text-sm text-slate-400">All caught up!</p>
                    <p className="text-xs text-slate-500 mt-1">No new advisor alerts.</p>
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <Link
                      key={n.id}
                      href={n.report_id ? `/ai-advisor?report=${n.report_id}` : '/ai-advisor'}
                      onClick={() => setShowNotifDropdown(false)}
                      className="block px-5 py-4 hover:bg-slate-800/40 transition-colors group"
                    >
                      <p className="text-sm font-bold text-slate-200 leading-tight group-hover:text-indigo-300 transition-colors">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mt-2">{new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </Link>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
                <Link href="/ai-advisor" onClick={() => setShowNotifDropdown(false)} className="block w-full py-2 text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
                  Open AI Advisor Hub
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-1">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
              alt={user?.name || 'Avatar'}
              className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-900 object-cover relative z-10 transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="text-left hidden sm:block mr-2 cursor-pointer group">
            <p className="text-sm font-bold text-white leading-tight group-hover:text-indigo-400 transition-colors">{user?.name || 'User'}</p>
            <p className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">{currentHousehold?.role || 'Member'}</p>
          </div>
          
          <button
            onClick={logout}
            title="Sign out"
            className="p-2.5 rounded-xl bg-slate-900/50 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
