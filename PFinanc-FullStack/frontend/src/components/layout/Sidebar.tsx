import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Users,
  BarChart3,
  ShieldCheck,
  BotMessageSquare,
  Plus,
  Target,
  PiggyBank,
  Settings,
  ChevronRight
} from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/router';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const primaryNavItems = [
    { id: 'dashboard', href: '/', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transactions', href: '/transactions', label: 'Transactions', icon: <Receipt className="w-5 h-5" /> },
    { id: 'investments', href: '/investments', label: 'Investments', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'accounts', href: '/accounts', label: 'Accounts', icon: <Wallet className="w-5 h-5" /> },
  ];

  const secondaryNavItems = [
    { id: 'family', href: '/family', label: 'Family', icon: <Users className="w-5 h-5" /> },
    { id: 'analytics', href: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'imports', href: '/imports', label: 'Imports', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'goals', href: '#', label: 'Goals', icon: <Target className="w-5 h-5" /> },
    { id: 'budgets', href: '#', label: 'Budgets', icon: <PiggyBank className="w-5 h-5" /> },
  ];

  const settingsItems = [
    { id: 'settings', href: '#', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const renderNav = (items: any[]) => (
    <nav className="px-3 py-1 space-y-1.5">
      {items.map((item) => {
        const isActive = router.pathname === item.href;
        return (
          <Link
            key={item.id}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
              isActive
                ? 'text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)] bg-gradient-to-r from-indigo-600/20 to-transparent border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            {/* Active Indicator Line */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_2px_rgba(99,102,241,0.8)]" />
            )}

            {/* Icon */}
            <span className={`relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]' : 'group-hover:text-indigo-400'}`}>
              {item.icon}
            </span>

            {/* Label */}
            {!isCollapsed && (
              <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 tracking-wide">
                {item.label}
              </span>
            )}

            {/* Hover Glow Background */}
            {!isActive && !isCollapsed && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-[260px]'} bg-[#090d16] border-r border-slate-800/80 flex-col justify-between flex-shrink-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative group/sidebar`}>
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-10 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-full p-1.5 z-50 transition-all duration-300 shadow-[0_0_15px_-3px_rgba(0,0,0,0.5)] hover:shadow-indigo-500/30 hover:border-indigo-500/50 hover:scale-110 opacity-0 group-hover/sidebar:opacity-100"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative z-10">
        {/* Brand Header */}
        <div className={`p-6 pb-4 flex items-center ${isCollapsed ? 'justify-center px-4' : 'gap-3'} transition-all duration-300`}>
          <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] relative overflow-hidden group-hover/sidebar:shadow-[0_0_25px_rgba(99,102,241,0.6)] transition-shadow duration-500">
            <div className="absolute inset-0 bg-white/20 blur-sm scale-150 rotate-45 transform -translate-x-full group-hover/sidebar:translate-x-full transition-transform duration-1000 ease-out" />
            <ShieldCheck className="w-5 h-5 text-white relative z-10" strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-black text-xl text-white tracking-tight whitespace-nowrap drop-shadow-sm">PFinanc</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest whitespace-nowrap opacity-80">Personal OS</p>
            </div>
          )}
        </div>

        {/* Primary Navigation Links */}
        <div className="mt-4">
          {renderNav(primaryNavItems)}
        </div>

        {/* Divider */}
        <div className="px-5 py-3">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent w-full" />
        </div>
        
        {/* Secondary Navigation */}
        {!isCollapsed && (
          <div className="px-6 pb-2 text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">
            More
          </div>
        )}
        {renderNav(secondaryNavItems)}
        
        {/* Divider */}
        <div className="px-5 py-3">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent w-full" />
        </div>

        {/* Settings */}
        {renderNav(settingsItems)}
        
        {/* Spacer for bottom */}
        <div className="h-6" />
      </div>
    </aside>
  );
};

