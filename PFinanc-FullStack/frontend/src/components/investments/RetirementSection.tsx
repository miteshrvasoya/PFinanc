import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  ShieldCheck,
  Plus,
  Calendar,
  History,
  CheckCircle2,
  X,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export const RetirementSection: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddContribModal, setShowAddContribModal] = useState(false);

  const [accountForm, setAccountForm] = useState({
    asset_type: 'EPF',
    institution_name: '',
    account_number: '',
    opening_balance: '',
  });

  const [contribForm, setContribForm] = useState({
    contribution_date: new Date().toISOString().split('T')[0],
    employee_contribution: '',
    employer_contribution: '',
    interest_amount: '0',
    withdrawal_amount: '0',
    notes: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getRetirementAccounts();
      if (res.success && res.data) {
        setAccounts(res.data);
        if (res.data.length > 0 && !selectedAccount) {
          setSelectedAccount(res.data[0]);
          loadContributions(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadContributions = async (accId: string) => {
    try {
      const res = await api.getRetirementContributions(accId);
      if (res.success && res.data) {
        setContributions(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAccount = (acc: any) => {
    setSelectedAccount(acc);
    loadContributions(acc.id);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createRetirementAccount(accountForm);
      if (res.success) {
        setShowAddAccountModal(false);
        setAccountForm({
          asset_type: 'EPF',
          institution_name: '',
          account_number: '',
          opening_balance: '',
        });
        loadAccounts();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      const res = await api.addRetirementContribution({
        retirement_account_id: selectedAccount.id,
        ...contribForm,
      });

      if (res.success) {
        setShowAddContribModal(false);
        setContribForm({
          contribution_date: new Date().toISOString().split('T')[0],
          employee_contribution: '',
          employer_contribution: '',
          interest_amount: '0',
          withdrawal_amount: '0',
          notes: '',
        });
        loadAccounts();
        loadContributions(selectedAccount.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalRetirement = accounts.reduce((acc, a) => acc + a.current_balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Retirement & Long-Term Assets</h3>
          <p className="text-xs text-slate-400">EPF, PPF, and NPS monthly contributions and compounding corpus</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Retirement Account</span>
          </button>
          {selectedAccount && (
            <button
              onClick={() => setShowAddContribModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-md shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Log Monthly Contribution</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Value Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-pink-500/30 bg-pink-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
            Total Family Retirement Corpus
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            {formatINR(totalRetirement)}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{accounts.length} Active Accounts</span>
        </div>
      </div>

      {/* 2-Column: Accounts list and Contribution History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List */}
        <div className="space-y-3">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
            Retirement Accounts
          </h4>

          {loading ? (
            <div className="text-slate-500 text-xs py-8 text-center">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="glass-panel rounded-xl p-6 text-center text-slate-500 text-xs border border-slate-800">
              No retirement accounts set up yet.
            </div>
          ) : (
            accounts.map((acc) => {
              const isSelected = selectedAccount?.id === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'glass-panel border-indigo-500/50 bg-indigo-500/10 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-pink-500/15 text-pink-400 border border-pink-500/30">
                      {acc.asset_type}
                    </span>
                    <span className="text-[11px] text-slate-400">{acc.user_name}</span>
                  </div>
                  <h5 className="font-bold text-white text-sm mt-2">{acc.institution_name}</h5>
                  <p className="text-[10px] text-slate-400 font-mono">{acc.account_number_masked}</p>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Current Balance:</span>
                    <span className="font-extrabold text-white text-sm">{formatINR(acc.current_balance)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Contribution Logs Table */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
            Contribution History {selectedAccount && `(${selectedAccount.institution_name})`}
          </h4>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Employee Contrib</th>
                    <th className="py-3 px-4 text-right">Employer Contrib</th>
                    <th className="py-3 px-4 text-right">Interest</th>
                    <th className="py-3 px-4 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contributions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        No monthly contribution logs recorded. Click "Log Monthly Contribution".
                      </td>
                    </tr>
                  ) : (
                    contributions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-medium text-slate-300">
                          {formatDate(c.contribution_date)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                          +{formatINR(c.employee_contribution)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-sky-400 font-bold">
                          +{formatINR(c.employer_contribution)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-400">
                          {c.interest_amount > 0 ? `+${formatINR(c.interest_amount)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-white">
                          {formatINR(c.total_closing_balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-sm">Add Retirement Account</h4>
              <button onClick={() => setShowAddAccountModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Asset Category</label>
                <select
                  value={accountForm.asset_type}
                  onChange={(e) => setAccountForm({ ...accountForm, asset_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="EPF">EPF (Employees Provident Fund)</option>
                  <option value="PPF">PPF (Public Provident Fund)</option>
                  <option value="NPS">NPS (National Pension Scheme)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Institution / Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EPFO, SBI PPF Branch, NSDL NPS"
                  value={accountForm.institution_name}
                  onChange={(e) => setAccountForm({ ...accountForm, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 10098271"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Current/Opening Balance (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="450000"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showAddContribModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-sm">Log Monthly Contribution</h4>
              <button onClick={() => setShowAddContribModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContribution} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Contribution Date</label>
                <input
                  type="date"
                  required
                  value={contribForm.contribution_date}
                  onChange={(e) => setContribForm({ ...contribForm, contribution_date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Employee Share (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3600"
                    value={contribForm.employee_contribution}
                    onChange={(e) => setContribForm({ ...contribForm, employee_contribution: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Employer Share (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3600"
                    value={contribForm.employer_contribution}
                    onChange={(e) => setContribForm({ ...contribForm, employer_contribution: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddContribModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  Save Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
