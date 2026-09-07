import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Receipt,
  FileSpreadsheet,
  FolderTree,
  Users,
  BarChart3,
  ShieldCheck,
  BotMessageSquare,
} from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/router';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const navItems: { id: string; href: string; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'accounts', href: '/accounts', label: 'Accounts', icon: <Wallet className="w-5 h-5" /> },
    { id: 'investments', href: '/investments', label: 'Investments & Portfolio', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'transactions', href: '/transactions', label: 'Transactions', icon: <Receipt className="w-5 h-5" /> },
    { id: 'transfers', href: '/transfers', label: 'Transfers', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'imports', href: '/imports', label: 'CSV Imports', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'categories', href: '/categories', label: 'Categories', icon: <FolderTree className="w-5 h-5" /> },
    { id: 'family', href: '/family', label: 'Family & Roles', icon: <Users className="w-5 h-5" /> },
    { id: 'analytics', href: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'ai-advisor', href: '/ai-advisor', label: 'AI Advisor', icon: <BotMessageSquare className="w-5 h-5" /> },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between flex-shrink-0 z-20 transition-all duration-300 relative`}>
      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full p-1 z-30 transition-transform shadow-lg"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <div>
        {/* Brand Header */}
        <div className={`p-6 border-b border-slate-800/60 flex items-center ${isCollapsed ? 'justify-center px-4' : 'gap-3'}`}>
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-white tracking-tight whitespace-nowrap">PFinanc</h1>
              <p className="text-xs text-indigo-400 font-medium whitespace-nowrap">Family Ledger & Portfolio</p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3.5'} py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400 flex-shrink-0'}>{item.icon}</span>
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className={`p-4 border-t border-slate-800/60 text-xs text-slate-500 text-center transition-opacity duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden border-t-0' : 'opacity-100'}`}>
        <p className="font-medium text-slate-400 whitespace-nowrap">PFinanc Self-Hosted v2.0</p>
        <p className="text-[10px] mt-0.5 text-slate-600 whitespace-nowrap">Strict Ledger & Zero Double-Count</p>
      </div>
    </aside>
  );
};
