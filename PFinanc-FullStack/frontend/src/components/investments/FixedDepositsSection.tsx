import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  Building,
  Plus,
  Calendar,
  Percent,
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';

export const FixedDepositsSection: React.FC = () => {
  const [fds, setFds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    institution_name: '',
    fd_number: '',
    principal_amount: '',
    interest_rate: '7.25',
    compounding_frequency: 'QUARTERLY',
    start_date: new Date().toISOString().split('T')[0],
    maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadFds();
  }, []);

  const loadFds = async () => {
    setLoading(true);
    try {
      const res = await api.getFixedDeposits();
      if (res.success && res.data) {
        setFds(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createFixedDeposit(formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          institution_name: '',
          fd_number: '',
          principal_amount: '',
          interest_rate: '7.25',
          compounding_frequency: 'QUARTERLY',
          start_date: new Date().toISOString().split('T')[0],
          maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: '',
        });
        loadFds();
      } else {
        alert(res.error?.message || 'Failed to create Fixed Deposit');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating FD');
    }
  };

  const totalPrincipal = fds.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.principal_amount : 0), 0);
  const totalCurrentValue = fds.reduce((acc, f) => acc + (f.status === 'ACTIVE' ? f.current_value : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Fixed Deposits (FDs)</h3>
          <p className="text-xs text-slate-400">Guaranteed fixed-income family assets & accrued interest</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fixed Deposit</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total FD Principal</span>
          <span className="text-xl font-bold text-white">{formatINR(totalPrincipal)}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">Current Accrued Value</span>
          <span className="text-xl font-bold text-amber-400">{formatINR(totalCurrentValue)}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Accrued Interest Gain</span>
          <span className="text-xl font-bold text-emerald-400">+{formatINR(totalCurrentValue - totalPrincipal)}</span>
        </div>
      </div>

      {/* FDs List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
          <span className="text-xs">Loading Fixed Deposits...</span>
        </div>
      ) : fds.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 border border-slate-800 text-xs">
          No Fixed Deposits recorded yet. Click "Add Fixed Deposit" to track term deposits.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fds.map((fd) => {
            const gain = fd.current_value - fd.principal_amount;
            return (
              <div
                key={fd.id}
                className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{fd.institution_name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {fd.fd_number_masked} • {fd.owner_name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      fd.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {fd.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Principal</span>
                    <span className="font-bold text-white">{formatINR(fd.principal_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Interest Rate</span>
                    <span className="font-bold text-amber-400">{fd.interest_rate}% p.a. ({fd.compounding_frequency})</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 block">Current Valuation</span>
                    <span className="font-extrabold text-white text-sm">{formatINR(fd.current_value)}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold block">+{formatINR(gain)} Interest</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 block">Maturity Value</span>
                    <span className="font-bold text-slate-200">{formatINR(fd.maturity_amount)}</span>
                    <span className="text-[10px] text-slate-500 block">On {formatDate(fd.maturity_date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add FD Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-sm">Add Fixed Deposit</h4>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFd} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Bank / Institution Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India, HDFC Bank"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="100000"
                    value={formData.principal_amount}
                    onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="7.25"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Maturity Date</label>
                  <input
                    type="date"
                    required
                    value={formData.maturity_date}
                    onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Compounding Frequency</label>
                <select
                  value={formData.compounding_frequency}
                  onChange={(e) => setFormData({ ...formData, compounding_frequency: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="QUARTERLY">Quarterly (Standard in India)</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="ANNUALLY">Annually</option>
                  <option value="AT_MATURITY">Simple Interest at Maturity</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  Save Fixed Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
