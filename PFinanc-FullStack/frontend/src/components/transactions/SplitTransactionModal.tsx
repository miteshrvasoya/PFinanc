import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';

export const SplitTransactionModal: React.FC<{
  transaction: any;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ transaction, categories, onClose, onSuccess }) => {
  const [splits, setSplits] = useState<any[]>([
    { amount: '', category_id: '', description: '' },
    { amount: '', category_id: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);

  const totalAmount = parseFloat(transaction.amount);
  const currentSplitTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const remaining = totalAmount - currentSplitTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(remaining) > 0.01) {
      alert(`Split amounts must equal the total transaction amount. Remaining: ${formatINR(remaining)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.splitTransaction(transaction.id, splits);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error?.message || 'Failed to split transaction');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Split Transaction</h3>
            <p className="text-xs text-slate-400 mt-1">{transaction.description} • {formatINR(totalAmount)}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 font-medium">Remaining to split:</span>
            <span className={`font-bold ${Math.abs(remaining) <= 0.01 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatINR(remaining)}
            </span>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
            {splits.map((split, idx) => (
              <div key={idx} className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Split #{idx + 1}</span>
                  {splits.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={split.amount}
                      onChange={(e) => {
                        const newSplits = [...splits];
                        newSplits[idx].amount = e.target.value;
                        setSplits(newSplits);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Category</label>
                    <select
                      value={split.category_id}
                      onChange={(e) => {
                        const newSplits = [...splits];
                        newSplits[idx].category_id = e.target.value;
                        setSplits(newSplits);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    >
                      <option value="">None</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={split.description}
                    onChange={(e) => {
                      const newSplits = [...splits];
                      newSplits[idx].description = e.target.value;
                      setSplits(newSplits);
                    }}
                    placeholder={transaction.description}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSplits([...splits, { amount: '', category_id: '', description: '' }])}
            className="w-full py-2 border border-dashed border-slate-600 rounded-xl text-slate-400 font-semibold flex items-center justify-center gap-2 hover:border-slate-400 hover:text-white"
          >
            <Plus className="w-4 h-4" /> Add Split Part
          </button>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Math.abs(remaining) > 0.01}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Splits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
