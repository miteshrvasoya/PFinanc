import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  Wallet,
  Landmark,
  Banknote,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Archive,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';

export const AccountsView: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'BANK',
    institution_name: '',
    account_number: '',
    opening_balance: 0,
    opening_balance_date: new Date().toISOString().split('T')[0],
    is_shared: false,
    notes: '',
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getAccounts();
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAccount({
        ...formData,
        opening_balance: parseFloat(String(formData.opening_balance)) || 0,
      });
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          name: '',
          account_type: 'BANK',
          institution_name: '',
          account_number: '',
          opening_balance: 0,
          opening_balance_date: new Date().toISOString().split('T')[0],
          is_shared: false,
          notes: '',
        });
        fetchAccounts();
      } else {
        alert(res.error?.message || 'Failed to create account');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    }
  };

  const handleToggleArchive = async (accountId: string) => {
    try {
      const res = await api.toggleArchiveAccount(accountId);
      if (res.success) {
        fetchAccounts();
        if (selectedAccount?.id === accountId) setSelectedAccount(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BANK':
        return <Landmark className="w-5 h-5 text-sky-400" />;
      case 'CASH':
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case 'CREDIT_CARD':
        return <CreditCard className="w-5 h-5 text-rose-400" />;
      default:
        return <Wallet className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Financial Accounts</h2>
          <p className="text-sm text-slate-400">Manage bank accounts, cash reserves, credit cards, and wallets</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
          <span>Loading Accounts...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
          <Wallet className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="font-semibold text-white">No Accounts Found</p>
          <p className="text-xs text-slate-500 mt-1">Create your first account to begin managing your ledger.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`glass-panel rounded-2xl p-5 border transition-all ${
                acc.is_active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              }`}
            >
              {/* Top Row: Type, Sharing Badge & Archive */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    {getAccountIcon(acc.account_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{acc.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      {acc.institution_name || acc.account_type} {acc.account_number_masked ? `• ${acc.account_number_masked}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {acc.is_shared && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      Shared
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedAccount(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="View Balance Waterfall Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Current Balance */}
              <div className="mt-5">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Current Balance</span>
                <div className="text-2xl font-black text-white tracking-tight mt-0.5">
                  {formatINR(acc.current_balance)}
                </div>
              </div>

              {/* Account Meta & Credits/Debits stats */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Owner</span>
                  <span className="font-semibold text-slate-300">{acc.owner_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Opening Balance</span>
                  <span className="font-medium text-slate-400">{formatINR(acc.opening_balance)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Detail Modal (Balance Waterfall) */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  {getAccountIcon(selectedAccount.account_type)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{selectedAccount.name}</h3>
                  <p className="text-xs text-slate-400">{selectedAccount.owner_name} • {selectedAccount.institution_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Waterfall Calculation Breakdown */}
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Deterministic Balance Calculation</p>
              
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Opening Balance ({formatDate(selectedAccount.opening_balance_date)})</span>
                  <span className="font-semibold text-white">{formatINR(selectedAccount.opening_balance)}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Total Confirmed Credits (Income, Refunds, Transfer In)
                  </span>
                  <span className="font-semibold">+{formatINR(selectedAccount.total_credits)}</span>
                </div>

                <div className="flex justify-between items-center text-rose-400">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Total Confirmed Debits (Expenses, Fees, Transfer Out)
                  </span>
                  <span className="font-semibold">-{formatINR(selectedAccount.total_debits)}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
                  <span>Calculated Current Balance</span>
                  <span className="text-base text-indigo-400">{formatINR(selectedAccount.current_balance)}</span>
                </div>
              </div>

              {selectedAccount.notes && (
                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-1">Notes:</span>
                  {selectedAccount.notes}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => handleToggleArchive(selectedAccount.id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{selectedAccount.is_active ? 'Archive Account' : 'Unarchive Account'}</span>
              </button>
              <button
                onClick={() => setSelectedAccount(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Financial Account</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mitesh - ICICI Savings"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Type *</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CASH">Physical Cash</option>
                    <option value="WALLET">Digital Wallet</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="BROKERAGE">Brokerage</option>
                    <option value="MUTUAL_FUND">Mutual Fund</option>
                    <option value="FD">Fixed Deposit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Institution Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={formData.institution_name}
                    onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 5010041234"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_shared"
                  checked={formData.is_shared}
                  onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_shared" className="text-slate-300 font-medium cursor-pointer">
                  Shared Household Account (Visible to all members)
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional description or details"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
