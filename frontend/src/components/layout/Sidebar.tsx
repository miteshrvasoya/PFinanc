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
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'accounts'
  | 'investments'
  | 'transactions'
  | 'transfers'
  | 'imports'
  | 'categories'
  | 'family'
  | 'analytics';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'accounts', label: 'Accounts', icon: <Wallet className="w-5 h-5" /> },
    { id: 'investments', label: 'Investments & Portfolio', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-5 h-5" /> },
    { id: 'transfers', label: 'Transfers', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'imports', label: 'CSV Imports', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-5 h-5" /> },
    { id: 'family', label: 'Family & Roles', icon: <Users className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between flex-shrink-0 z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight">PFinanc</h1>
            <p className="text-xs text-indigo-400 font-medium">Family Ledger & Portfolio</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/60 text-xs text-slate-500 text-center">
        <p className="font-medium text-slate-400">PFinanc Self-Hosted v2.0</p>
        <p className="text-[10px] mt-0.5 text-slate-600">Strict Ledger & Zero Double-Count</p>
      </div>
    </aside>
  );
};
