import React, { useState } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import { Building, Layers, ShieldCheck, Wallet, Plus, Trash2, Eye } from 'lucide-react';

interface PortfolioAccountsTabProps {
  accounts: any[];
  onRefresh: () => void;
  onRecordTrade: () => void;
}

export const PortfolioAccountsTab: React.FC<PortfolioAccountsTabProps> = ({ accounts, onRefresh, onRecordTrade }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    institution_name: '',
    account_type: 'BROKERAGE',
    account_number: '',
  });

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BROKERAGE': return <Building className="w-5 h-5 text-indigo-400" />;
      case 'MUTUAL_FUND': return <Layers className="w-5 h-5 text-emerald-400" />;
      case 'RETIREMENT': return <ShieldCheck className="w-5 h-5 text-amber-400" />;
      default: return <Wallet className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAccount({
        name: formData.name || formData.institution_name,
        institution_name: formData.institution_name,
        account_type: formData.account_type,
        account_number: formData.account_number,
        opening_balance: 0,
      });

      if (res.success) {
        setShowAddForm(false);
        setFormData({ name: '', institution_name: '', account_type: 'BROKERAGE', account_number: '' });
        onRefresh();
      } else {
        alert(res.error?.message || 'Failed to create account');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-lg">Investment & Brokerage Accounts</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel p-5 rounded-xl border border-indigo-500/30">
          <h4 className="font-bold text-white text-sm mb-4">New Investment Account</h4>
          <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Type</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="BROKERAGE">Stock Broker (Demat)</option>
                  <option value="MUTUAL_FUND">Mutual Fund / AMC</option>
                  <option value="RETIREMENT">Retirement (EPF/PPF)</option>
                  <option value="OTHER">Other Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Institution / Platform</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zerodha, Groww"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Demat"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Number / Folio (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 12345678"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-xl border border-slate-800">
          <Wallet className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No investment accounts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/50">
                      {getAccountIcon(acc.account_type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.account_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <p className="text-xs text-slate-300"><span className="text-slate-500">Platform:</span> {acc.institution_name || 'N/A'}</p>
                  <p className="text-xs text-slate-300"><span className="text-slate-500">ID/Folio:</span> {acc.account_number_masked || 'N/A'}</p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">Manage Assets</span>
                <button
                  onClick={onRecordTrade}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Add Trade/SIP
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
