import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  ArrowLeftRight,
  Plus,
  ArrowRight,
  ShieldCheck,
  XCircle,
  RefreshCw,
  X,
  User,
  Landmark,
} from 'lucide-react';

interface TransfersViewProps {
  initialOpen?: boolean;
  onClearInitialOpen?: () => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({ initialOpen, onClearInitialOpen }) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    source_account_id: '',
    destination_account_id: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    status: 'CONFIRMED',
  });

  useEffect(() => {
    if (initialOpen) {
      setShowModal(true);
      if (onClearInitialOpen) onClearInitialOpen();
    }
  }, [initialOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trRes, accRes] = await Promise.all([api.getTransfers(), api.getAccounts()]);
      if (trRes.success && trRes.data) {
        setTransfers(trRes.data);
      }
      if (accRes.success && accRes.data) {
        setAccounts(accRes.data);
        if (accRes.data.length >= 2) {
          setFormData((prev) => ({
            ...prev,
            source_account_id: prev.source_account_id || accRes.data[0].id,
            destination_account_id: prev.destination_account_id || accRes.data[1].id,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.source_account_id === formData.destination_account_id) {
      alert('Source and destination accounts must be different');
      return;
    }

    try {
      const res = await api.createTransfer({
        ...formData,
        amount: parseFloat(formData.amount),
      });

      if (res.success) {
        setShowModal(false);
        setFormData({
          source_account_id: accounts[0]?.id || '',
          destination_account_id: accounts[1]?.id || '',
          amount: '',
          transfer_date: new Date().toISOString().split('T')[0],
          description: '',
          reference: '',
          status: 'CONFIRMED',
        });
        loadData();
      } else {
        alert(res.error?.message || 'Failed to create transfer');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating transfer');
    }
  };

  const handleVoidTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to void this transfer? Both source and destination ledger entries will be voided atomically.')) {
      return;
    }
    try {
      const res = await api.voidTransfer(transferId);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedSource = accounts.find((a) => a.id === formData.source_account_id);
  const selectedDest = accounts.find((a) => a.id === formData.destination_account_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Family & Inter-Account Transfers</h2>
          <p className="text-sm text-slate-400">
            First-class atomic transfers with zero double-counting in household income/expense
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Transfer</span>
        </button>
      </div>

      {/* Accounting Invariant Notice Banner */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3.5 text-xs text-indigo-300">
        <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white text-sm">Ledger Invariant Guarantee</p>
          <p className="mt-0.5 text-slate-300 leading-relaxed">
            Transfers atomically debit the source account and credit the destination account without appearing in household Income, Expense, or spending analytics. Net Worth remains perfectly conserved.
          </p>
        </div>
      </div>

      {/* Transfer List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading Transfers...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No transfers recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {transfers.map((tr) => {
              const isVoid = tr.status === 'VOID';
              return (
                <div
                  key={tr.id}
                  className={`p-5 hover:bg-slate-800/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                    isVoid ? 'opacity-40 line-through' : ''
                  }`}
                >
                  {/* Left: Transfer Flow Visual */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Source Account Box */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex-1 max-w-xs">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">From Account</span>
                      <p className="font-bold text-slate-200 text-sm">{tr.source_account_name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-indigo-400" /> {tr.source_owner_name}
                      </p>
                    </div>

                    {/* Flow Arrow */}
                    <div className="flex flex-col items-center justify-center px-2">
                      <span className="text-sm font-black text-indigo-400 mb-1">{formatINR(tr.amount)}</span>
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Destination Account Box */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex-1 max-w-xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">To Account</span>
                      <p className="font-bold text-slate-200 text-sm">{tr.destination_account_name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-emerald-400" /> {tr.destination_owner_name}
                      </p>
                    </div>
                  </div>

                  {/* Right: Date, Description, Status, Void Action */}
                  <div className="flex items-center gap-4 text-right justify-between md:justify-end">
                    <div>
                      <p className="font-semibold text-slate-300">{tr.description || 'Inter-account transfer'}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatDate(tr.transfer_date)} {tr.reference ? `• Ref: ${tr.reference}` : ''}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        tr.status === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {tr.status}
                    </span>

                    {!isVoid && (
                      <button
                        onClick={() => handleVoidTransfer(tr.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Void Transfer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Family & Account Transfer Wizard</h3>
                  <p className="text-xs text-slate-400">Move funds between accounts or family members</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="mt-5 space-y-4 text-xs">
              {/* Account Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Account */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">From Source Account *</label>
                  <select
                    required
                    value={formData.source_account_id}
                    onChange={(e) => setFormData({ ...formData, source_account_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.owner_name})
                      </option>
                    ))}
                  </select>
                  {selectedSource && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Current Balance: <span className="font-bold text-emerald-400">{formatINR(selectedSource.current_balance)}</span>
                    </div>
                  )}
                </div>

                {/* Destination Account */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">To Destination Account *</label>
                  <select
                    required
                    value={formData.destination_account_id}
                    onChange={(e) => setFormData({ ...formData, destination_account_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.owner_name})
                      </option>
                    ))}
                  </select>
                  {selectedDest && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Current Balance: <span className="font-bold text-indigo-400">{formatINR(selectedDest.current_balance)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Transfer Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 10000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.transfer_date}
                    onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Support, Pocket Money, Rent Share"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">UPI / Bank Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/IMPS/20260817/88921"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/20"
                >
                  Execute Atomic Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
