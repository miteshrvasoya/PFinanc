import React, { useState, useRef } from 'react';
import { api } from '../../../lib/api';
import { formatINR } from '../../../lib/formatters';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Settings,
  AlertTriangle,
} from 'lucide-react';

interface InvestmentImportWizardProps {
  accounts: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const InvestmentImportWizard: React.FC<InvestmentImportWizardProps> = ({
  accounts,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [investmentType, setInvestmentType] = useState<'STOCK' | 'MUTUAL_FUND'>('STOCK');
  const [importMode, setImportMode] = useState<'TRANSACTIONS' | 'HOLDINGS'>('TRANSACTIONS');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [importId, setImportId] = useState<string>('');
  
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<any>({});
  
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setFileContent(evt.target.result as string);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !fileContent || !selectedAccountId) return;
    setLoading(true);
    try {
      const res = await api.createInvestmentImport(
        selectedAccountId,
        investmentType,
        importMode,
        file.name,
        fileContent
      );
      if (res.success && res.data) {
        setImportId(res.data.importId);
        setHeaders(res.data.headers);
        setMapping(res.data.detectedMapping || {});
        setStep(4); // Move to Column Mapping
      } else {
        alert(res.error?.message || 'Failed to upload statement');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleParse = async () => {
    if (!importId) return;
    setLoading(true);
    try {
      const res = await api.parseInvestmentImport(importId, mapping);
      if (res.success) {
        // Fetch preview
        const previewRes = await api.getInvestmentImportPreview(importId);
        if (previewRes.success && previewRes.data) {
          setPreviewResult(previewRes.data);
          setStep(5); // Move to Review
        }
      } else {
        alert(res.error?.message || 'Failed to parse statement');
      }
    } catch (err: any) {
      alert(err.message || 'Error parsing statement');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!importId) return;
    setLoading(true);
    try {
      const res = await api.commitInvestmentImport(importId, includeDuplicates);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.error?.message || 'Failed to commit investment trades');
      }
    } catch (err: any) {
      alert(err.message || 'Error committing trades');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
          }`}>
            {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < 5 && <div className={`w-8 h-px ${step > s ? 'bg-emerald-500/50' : 'bg-slate-800'}`}></div>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Investment Statement Import</h4>
              <p className="text-xs text-slate-400">
                Safely import historical transactions or current holdings
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderStepIndicator()}

        <div className="flex-1 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg mb-4">Step 1: Investment Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setInvestmentType('STOCK')}
                  className={`p-4 rounded-xl border text-left transition-all ${investmentType === 'STOCK' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <h4 className={`font-bold ${investmentType === 'STOCK' ? 'text-indigo-400' : 'text-slate-300'}`}>Stocks / Equity</h4>
                  <p className="text-xs text-slate-400 mt-1">Direct equity shares, ETFs.</p>
                </button>
                <button
                  onClick={() => setInvestmentType('MUTUAL_FUND')}
                  className={`p-4 rounded-xl border text-left transition-all ${investmentType === 'MUTUAL_FUND' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <h4 className={`font-bold ${investmentType === 'MUTUAL_FUND' ? 'text-indigo-400' : 'text-slate-300'}`}>Mutual Funds</h4>
                  <p className="text-xs text-slate-400 mt-1">SIPs, lumpsum mutual fund units.</p>
                </button>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => setStep(2)} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg mb-4">Step 2: Import Mode</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setImportMode('TRANSACTIONS')}
                  className={`p-4 rounded-xl border text-left transition-all ${importMode === 'TRANSACTIONS' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <h4 className={`font-bold ${importMode === 'TRANSACTIONS' ? 'text-indigo-400' : 'text-slate-300'}`}>Transaction History</h4>
                  <p className="text-xs text-slate-400 mt-1">Import all historical buy/sell trades to construct exact P&L and cost basis.</p>
                </button>
                <button
                  onClick={() => setImportMode('HOLDINGS')}
                  className={`p-4 rounded-xl border text-left transition-all ${importMode === 'HOLDINGS' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <h4 className={`font-bold ${importMode === 'HOLDINGS' ? 'text-indigo-400' : 'text-slate-300'}`}>Current Holdings (Snapshot)</h4>
                  <p className="text-xs text-slate-400 mt-1">Only import what you currently own. No transaction history will be created.</p>
                </button>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg mb-4">Step 3: Account & File</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 text-sm">Target Investment Account</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.owner_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1 text-sm">Broker Statement (CSV)</label>
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 font-medium border-dashed"
                    >
                      <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                      <span className="truncate">{file ? file.name : 'Click to select CSV file...'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button 
                  onClick={handleUpload} 
                  disabled={!file || loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Upload & Proceed'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Step 4: Column Mapping</h3>
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Auto-detected mapped fields</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <div className="grid grid-cols-2 gap-4">
                  {['symbolCol', 'dateCol', 'typeCol', 'qtyCol', 'priceCol', 'amountCol'].map((field) => (
                    <div key={field} className="flex flex-col gap-1 text-xs">
                      <label className="text-slate-400 font-semibold">{field.replace('Col', '')}</label>
                      <select 
                        value={mapping[field] || ''} 
                        onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                      >
                        <option value="">-- Ignored --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(3)} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button 
                  onClick={handleParse} 
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Parse Data'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && previewResult && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg mb-4">Step 5: Review Issues & Confirm</h3>
              <div className="grid grid-cols-4 gap-3 text-xs mb-4">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Parsed</span>
                  <span className="text-xl font-bold text-white">{previewResult.import.parsed_rows}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Valid</span>
                  <span className="text-xl font-bold text-emerald-400">{previewResult.import.valid_rows}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold text-rose-400">Invalid</span>
                  <span className="text-xl font-bold text-rose-400">{previewResult.import.invalid_rows}</span>
                </div>
              </div>

              {previewResult.import.invalid_rows > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2 items-start text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <p>Some rows were invalid or duplicates and will be skipped unless forced.</p>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs bg-slate-900/30">
                {previewResult.rows.slice(0, 100).map((r: any) => (
                  <div
                    key={r.id}
                    className={`p-2.5 flex items-center justify-between ${
                      r.validation_status === 'DUPLICATE'
                        ? 'bg-amber-500/5 text-amber-300'
                        : r.validation_status === 'INVALID'
                        ? 'bg-rose-500/5 text-rose-300'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-slate-500 w-8">#{r.source_row_number}</span>
                      {r.normalized_data ? (
                        <>
                          <span className="font-bold text-white min-w-16">{r.normalized_data.symbol}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold w-12">
                            {r.normalized_data.type || 'HOLDING'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {r.normalized_data.quantity} units @ {formatINR(r.normalized_data.price || r.normalized_data.currentPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-rose-400">Parse failed: {r.error_message}</span>
                      )}
                    </div>
                    <div className="text-right">
                      {r.normalized_data && (
                        <span className="font-mono font-bold text-white block">
                          {formatINR(r.normalized_data.amount || r.normalized_data.currentValue)}
                        </span>
                      )}
                      <span
                        className={`block text-[9px] font-extrabold uppercase ${
                          r.validation_status === 'VALID'
                            ? 'text-emerald-400'
                            : r.validation_status === 'DUPLICATE'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {r.validation_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4">
                <button onClick={() => setStep(4)} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id="include_dups_inv"
                      checked={includeDuplicates}
                      onChange={(e) => setIncludeDuplicates(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="include_dups_inv" className="text-slate-300 font-medium cursor-pointer">
                      Force include duplicates
                    </label>
                  </div>
                  <button 
                    onClick={handleCommit}
                    disabled={loading || (!includeDuplicates && previewResult.import.valid_rows === 0)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-md shadow-emerald-500/20"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Commit Import
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
