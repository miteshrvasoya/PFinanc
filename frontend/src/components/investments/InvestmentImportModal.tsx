import React, { useState, useRef } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface InvestmentImportModalProps {
  accounts: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const InvestmentImportModal: React.FC<InvestmentImportModalProps> = ({
  accounts,
  onClose,
  onSuccess,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file || !selectedAccountId) {
      alert('Please select an account and a CSV file');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const res = await api.previewInvestmentImport(selectedAccountId, file.name, text);
      if (res.success && res.data) {
        setPreviewResult(res.data);
      } else {
        alert(res.error?.message || 'Failed to preview broker statement');
      }
    } catch (err: any) {
      alert(err.message || 'Error parsing statement file');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult?.batchId) return;

    setCommitting(true);
    try {
      const res = await api.commitInvestmentImport(previewResult.batchId, includeDuplicates);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.error?.message || 'Failed to commit investment trades');
      }
    } catch (err: any) {
      alert(err.message || 'Error committing trades');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Import Broker Portfolio Statement</h4>
              <p className="text-xs text-slate-400">
                Upload Zerodha / Groww / Generic tradebook CSV with automated security resolution
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Uploader Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Target Investment Account *</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.owner_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Broker Statement (CSV) *</label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 font-medium"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{file ? file.name : 'Choose File...'}</span>
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || loading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold"
              >
                {loading ? 'Parsing...' : 'Preview'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Results */}
        {previewResult && (
          <div className="space-y-4 pt-2">
            {/* Metric counters */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                <span className="text-lg font-bold text-white">{previewResult.metrics.totalRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Valid New</span>
                <span className="text-lg font-bold text-emerald-400">{previewResult.metrics.validRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Duplicates</span>
                <span className="text-lg font-bold text-amber-400">{previewResult.metrics.duplicateRows}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] uppercase font-bold text-rose-400 block">Invalid</span>
                <span className="text-lg font-bold text-rose-400">{previewResult.metrics.invalidRows}</span>
              </div>
            </div>

            {/* Commit bar */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_dups_inv"
                  checked={includeDuplicates}
                  onChange={(e) => setIncludeDuplicates(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="include_dups_inv" className="text-slate-300 font-medium cursor-pointer">
                  Force include duplicate rows
                </label>
              </div>

              <button
                type="button"
                onClick={handleCommit}
                disabled={committing || (previewResult.metrics.validRows === 0 && !includeDuplicates)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit {includeDuplicates ? previewResult.metrics.totalRows : previewResult.metrics.validRows} Trades</span>
                  </>
                )}
              </button>
            </div>

            {/* Rows list */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs">
              {previewResult.rows.map((r: any) => (
                <div
                  key={r.row_index}
                  className={`p-2.5 flex items-center justify-between ${
                    r.status === 'DUPLICATE'
                      ? 'bg-amber-500/5 text-amber-300'
                      : r.status === 'INVALID'
                      ? 'bg-rose-500/5 text-rose-300'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">#{r.row_index}</span>
                    <span className="font-bold text-white">{r.parsed_data?.symbol}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {r.parsed_data?.type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {r.parsed_data?.quantity} units @ {formatINR(r.parsed_data?.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">{formatINR(r.parsed_data?.amount)}</span>
                    <span
                      className={`block text-[9px] font-extrabold uppercase ${
                        r.status === 'VALID'
                          ? 'text-emerald-400'
                          : r.status === 'DUPLICATE'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
