import React, { useState } from 'react';
import { formatINR, formatDate } from '../../lib/formatters';
import { api } from '../../lib/api';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FolderTree,
} from 'lucide-react';

interface UniversalImportReviewProps {
  previewData: any;
  categories: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const UniversalImportReview: React.FC<UniversalImportReviewProps> = ({
  previewData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [rowOverrides, setRowOverrides] = useState<Record<string, any>>({});
  const [committing, setCommitting] = useState(false);

  const handleCategoryChange = (rowId: string, categoryId: string, merchantPattern?: string) => {
    setRowOverrides((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        category_id: categoryId,
        save_rule: prev[rowId]?.save_rule ?? true,
      },
    }));
  };

  const handleTypeChange = (rowId: string, type: string) => {
    setRowOverrides((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        transaction_type: type,
      },
    }));
  };

  const handleToggleSaveRule = (rowId: string, checked: boolean) => {
    setRowOverrides((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        save_rule: checked,
      },
    }));
  };

  const handleCommit = async () => {
    setCommitting(true);
    try {
      const res = await api.commitImport(previewData.batchId, {
        includeDuplicates,
        rowOverrides,
      });

      if (res.success) {
        onSuccess();
      } else {
        alert(res.error?.message || 'Failed to commit transactions');
      }
    } catch (err: any) {
      alert(err.message || 'Error committing import');
    } finally {
      setCommitting(false);
    }
  };

  const validCount = previewData.metrics.validRows;
  const duplicateCount = previewData.metrics.duplicateRows;
  const totalCount = includeDuplicates ? validCount + duplicateCount : validCount;

  return (
    <div className="space-y-4 text-xs">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="glass-panel p-3 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Statement Rows</span>
          <span className="text-lg font-extrabold text-white">{previewData.metrics.totalRows}</span>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
          <span className="text-[10px] text-emerald-400 font-bold uppercase block">Ready to Import</span>
          <span className="text-lg font-extrabold text-emerald-400">{previewData.metrics.validRows}</span>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
          <span className="text-[10px] text-amber-400 font-bold uppercase block">Duplicate Matches</span>
          <span className="text-lg font-extrabold text-amber-400">{previewData.metrics.duplicateRows}</span>
        </div>
        <div className="glass-panel p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-center">
          <span className="text-[10px] text-rose-400 font-bold uppercase block">Invalid / Skipped</span>
          <span className="text-lg font-extrabold text-rose-400">{previewData.metrics.invalidRows}</span>
        </div>
      </div>

      {/* Row Table with Inline Classifier Selection */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[9px] sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Assigned Category</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {previewData.rows.map((row: any) => {
                const p = row.parsed_data || {};
                const override = rowOverrides[row.id] || {};
                const currentCatId = override.category_id !== undefined ? override.category_id : p.category_id;
                const currentType = override.transaction_type || p.transaction_type || 'EXPENSE';
                const isDup = row.status === 'DUPLICATE';

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      isDup ? 'opacity-60 bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-300 font-medium">
                      {formatDate(p.date)}
                    </td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-white font-semibold">
                      {p.description}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={currentType}
                        onChange={(e) => handleTypeChange(row.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                        <option value="TRANSFER">Transfer</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <select
                          value={currentCatId || ''}
                          onChange={(e) => handleCategoryChange(row.id, e.target.value, p.description)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type})
                            </option>
                          ))}
                        </select>

                        {p.confidence && (
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                            <span
                              className={`px-1 rounded font-bold uppercase text-[8px] ${
                                p.confidence === 'USER_RULE'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : p.confidence === 'SYSTEM_RULE'
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : p.confidence === 'TRANSFER_DETECTED'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {p.confidence}
                            </span>

                            <label className="flex items-center gap-1 cursor-pointer text-slate-400 hover:text-slate-300">
                              <input
                                type="checkbox"
                                checked={override.save_rule ?? true}
                                onChange={(e) => handleToggleSaveRule(row.id, e.target.checked)}
                                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                              />
                              <span>Remember Rule</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          row.status === 'VALID'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : row.status === 'DUPLICATE'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include_dups"
            checked={includeDuplicates}
            onChange={(e) => setIncludeDuplicates(e.target.checked)}
            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="include_dups" className="text-slate-300 font-semibold cursor-pointer">
            Include {duplicateCount} duplicate records in import
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={committing || totalCount === 0}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {committing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing Transactions...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Import {totalCount} Transactions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
