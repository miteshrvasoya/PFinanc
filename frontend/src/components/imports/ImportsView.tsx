import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export const ImportsView: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<number | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.getAccounts();
      if (res.success && res.data) {
        setAccounts(res.data);
        if (res.data.length > 0) {
          setSelectedAccountId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewResult(null);
      setCommitSuccess(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file || !selectedAccountId) {
      alert('Please select an account and a CSV file');
      return;
    }

    setLoading(true);
    setCommitSuccess(null);
    try {
      const res = await api.previewCsv(selectedAccountId, file);
      if (res.success && res.data) {
        setPreviewResult(res.data);
      } else {
        alert(res.error?.message || 'Failed to parse and preview CSV');
      }
    } catch (err: any) {
      alert(err.message || 'Error parsing CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult?.batchId) return;

    setCommitting(true);
    try {
      const res = await api.commitImport(previewResult.batchId, includeDuplicates);
      if (res.success && res.data) {
        setCommitSuccess(res.data.importedCount);
        setPreviewResult(null);
        setFile(null);
      } else {
        alert(res.error?.message || 'Failed to commit import batch');
      }
    } catch (err: any) {
      alert(err.message || 'Error committing import');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h2 className="text-2xl font-bold text-white tracking-tight">CSV Statement Ingestion</h2>
        <p className="text-sm text-slate-400">
          Upload bank statements with automated column mapping & deterministic SHA256 duplicate detection
        </p>
      </div>

      {/* Commit Success Banner */}
      {commitSuccess !== null && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-bold text-white text-sm">Statement Ingested Successfully!</p>
              <p className="text-emerald-300/80">Imported {commitSuccess} confirmed transactions into the ledger.</p>
            </div>
          </div>
          <button
            onClick={() => setCommitSuccess(null)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Uploader Box */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Account Select */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Select Target Account *</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.owner_name}) • {a.institution_name || a.account_type}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Action */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Select Bank CSV File *</label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 font-medium transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{file ? file.name : 'Choose CSV File...'}</span>
              </button>
              <button
                onClick={handleUploadAndPreview}
                disabled={!file || loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {previewResult && (
        <div className="space-y-4">
          {/* Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows</span>
              <span className="text-xl font-bold text-white">{previewResult.metrics.totalRows}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Valid New Rows</span>
              <span className="text-xl font-bold text-emerald-400">{previewResult.metrics.validRows}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Duplicates Detected</span>
              <span className="text-xl font-bold text-amber-400">{previewResult.metrics.duplicateRows}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
              <span className="text-[10px] uppercase font-bold text-rose-400 block">Invalid Rows</span>
              <span className="text-xl font-bold text-rose-400">{previewResult.metrics.invalidRows}</span>
            </div>
          </div>

          {/* Commit Bar */}
          <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="include_dups"
                checked={includeDuplicates}
                onChange={(e) => setIncludeDuplicates(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="include_dups" className="text-slate-300 font-medium cursor-pointer">
                Force include duplicates ({previewResult.metrics.duplicateRows} rows)
              </label>
            </div>

            <button
              onClick={handleCommit}
              disabled={committing || (previewResult.metrics.validRows === 0 && !includeDuplicates)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {committing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Committing Batch...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Commit {includeDuplicates ? previewResult.metrics.totalRows : previewResult.metrics.validRows} Transactions to Ledger</span>
                </>
              )}
            </button>
          </div>

          {/* Preview Rows Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-white">
              Parsed Statement Rows Preview
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {previewResult.rows.map((r: any) => {
                    const isDup = r.status === 'DUPLICATE';
                    const isInvalid = r.status === 'INVALID';
                    const isIncome = r.parsed_data?.transaction_type === 'INCOME';

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-800/30 ${
                          isDup ? 'bg-amber-500/5 text-amber-300' : isInvalid ? 'bg-rose-500/5 text-rose-300' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-500 font-mono">{r.row_index}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'VALID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isDup
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {r.status}
                          </span>
                          {r.duplicate_reason && (
                            <span className="text-[10px] text-amber-400/80 block mt-0.5">{r.duplicate_reason}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                          {formatDate(r.parsed_data?.date)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {r.parsed_data?.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                          {r.parsed_data?.reference || '—'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={`font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? '+' : '-'}{formatINR(r.parsed_data?.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
