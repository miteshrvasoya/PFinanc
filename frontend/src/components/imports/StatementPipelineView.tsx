import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Search,
  Filter,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';

interface StatementPipelineViewProps {
  accounts: any[];
  onImportComplete?: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const StatementPipelineView: React.FC<StatementPipelineViewProps> = ({
  accounts,
  onImportComplete,
  onNavigateToTab,
}) => {
  // Steps: 1 = Upload & Ingestion, 2 = AI Processing, 3 = Review & Commit
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Upload State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Ingestion Data & AI State
  const [importData, setImportData] = useState<any | null>(null);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [retryingChunkId, setRetryingChunkId] = useState<string | null>(null);

  // Step 3: Review State
  const [reviewResults, setReviewResults] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [rowOverrides, setRowOverrides] = useState<Record<string, any>>({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [committedCount, setCommittedCount] = useState<number | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const bank = accounts.find((a) => a.account_type === 'BANK') || accounts[0];
      setSelectedAccountId(bank.id);
    }
  }, [accounts, selectedAccountId]);

  // Poll status when AI is running in background
  useEffect(() => {
    let interval: any;
    if (importData?.id && (importData.status === 'AI_PROCESSING' || isAiRunning)) {
      interval = setInterval(async () => {
        try {
          const res = await api.getStatementImport(importData.id);
          if (res.success && res.data) {
            setImportData(res.data);
            if (
              res.data.status === 'READY_FOR_REVIEW' ||
              res.data.status === 'AI_PARTIAL_FAILURE' ||
              res.data.status === 'COMPLETED'
            ) {
              setIsAiRunning(false);
              if (res.data.status === 'READY_FOR_REVIEW') {
                // Auto load review data
                loadReview(res.data.id);
              }
            }
          }
        } catch (err) {
          console.error('Statement polling error:', err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [importData?.id, importData?.status, isAiRunning]);

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please drop a valid .csv file.');
      }
    }
  };

  // Phase 1: Upload, Deterministic Parsing & Auto Start AI
  const handleUploadAndParse = async () => {
    if (!file) {
      setError('Please select or drop a CSV statement file.');
      return;
    }
    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Upload & Deterministically store rows in PostgreSQL
      const res = await api.uploadStatement(selectedAccountId, file, undefined, true);
      if (res.success && res.data) {
        const importId = res.data.importId;
        
        // 2. Fetch full import record
        const fullImp = await api.getStatementImport(importId);
        setImportData(fullImp.data);
        setStep(2);
        setIsAiRunning(true);

        // 3. Immediately trigger AI analysis
        try {
          await api.startAiAnalysis(importId, {
            chunkSize: 250,
            forceMock: false,
            asyncExecution: true,
          });
        } catch (aiErr: any) {
          console.warn('AI run start notice:', aiErr.message);
        }
      } else {
        setError(res.error?.message || 'Failed to upload statement file.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during statement ingestion.');
    } finally {
      setIsUploading(false);
    }
  };

  // Phase 2: Retry Chunk (Standard or Fallback)
  const handleRetryChunk = async (chunkId: string, forceMock = false) => {
    setRetryingChunkId(chunkId);
    setError(null);
    try {
      await api.retryAiChunk(chunkId, forceMock);
      const updated = await api.getStatementImport(importData.id);
      setImportData(updated.data);
      if (updated.data.status === 'READY_FOR_REVIEW') {
        loadReview(importData.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retry chunk processing.');
    } finally {
      setRetryingChunkId(null);
    }
  };

  // Retry all failed chunks with fast inference
  const handleFastInferenceFallback = async () => {
    if (!importData?.chunks) return;
    const failed = importData.chunks.filter((c: any) => c.status === 'FAILED');
    for (const chk of failed) {
      await handleRetryChunk(chk.id, true);
    }
  };

  // Load Review Layer
  const loadReview = async (importId: string) => {
    try {
      const res = await api.getStatementReview(importId);
      if (res.success && res.data) {
        setReviewResults(res.data.results || []);
        setCategories(res.data.categories || []);
        setStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load review data.');
    }
  };

  // Update category override in review
  const handleCategoryChange = (parsedRowId: string, categoryId: string) => {
    setRowOverrides((prev) => ({
      ...prev,
      [parsedRowId]: {
        ...(prev[parsedRowId] || {}),
        category_id: categoryId,
      },
    }));
  };

  // Update transaction type in review
  const handleTypeChange = (parsedRowId: string, type: string) => {
    setRowOverrides((prev) => ({
      ...prev,
      [parsedRowId]: {
        ...(prev[parsedRowId] || {}),
        transaction_type: type,
      },
    }));
  };

  // Phase 3: Confirm & Commit to Ledger
  const handleConfirm = async () => {
    if (!importData?.id) return;
    setIsCommitting(true);
    setError(null);

    try {
      const res = await api.confirmStatementImport(importData.id, {
        includeDuplicates,
        rowOverrides,
      });

      if (res.success && res.data) {
        setCommittedCount(res.data.committedCount);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setError(res.error?.message || 'Failed to commit statement import.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to commit statement import.');
    } finally {
      setIsCommitting(false);
    }
  };

  // Reset to initial upload state
  const handleReset = () => {
    setStep(1);
    setFile(null);
    setImportData(null);
    setReviewResults([]);
    setCommittedCount(null);
    setError(null);
    setRowOverrides({});
  };

  // Filtered review results
  const filteredResults = reviewResults.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.merchant && item.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.suggestedCategory && item.suggestedCategory.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType =
      typeFilter === 'ALL' ||
      item.transactionType === typeFilter ||
      (typeFilter === 'INCOME' && item.direction === 'CREDIT');

    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Pipeline Tracker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              AI Statement Ingestion Pipeline
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic PostgreSQL row persistence $\rightarrow$ Chunked AI classification $\rightarrow$ Ledger commitment.
            </p>
          </div>
        </div>

        {/* Phase Step Badges */}
        <div className="flex items-center space-x-2">
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              step === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">1</span>
            Deterministic Ingestion
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              step === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">2</span>
            AI Classification
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              step === 3 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">3</span>
            Review & Commit
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-300 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: UPLOAD & INGESTION */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Destination Bank Account *
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution_name || a.account_type}) — Balance: ₹{Number(a.current_balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Statement CSV File *
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-indigo-500 bg-slate-800/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setError(null);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-300">
                  {file ? (
                    <>
                      <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
                      <div className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • Ready to parse
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-indigo-400" />
                      <div className="text-sm font-medium text-slate-200">
                        Click to browse or drop CSV statement
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Supports HDFC, ICICI, SBI, Axis, Kotak, Zerodha, and generic standard CSVs
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Strict Data Safety Architecture:</span> All CSV rows are first parsed and persisted deterministically in PostgreSQL. Only after the complete statement is safely stored does the AI analysis run.
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleUploadAndParse}
              disabled={isUploading || !file || !selectedAccountId}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Uploading & Starting AI Parser...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Upload & Analyze Statement with AI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: AI CHUNK TRACKER */}
      {/* ========================================================= */}
      {step === 2 && importData && (
        <div className="space-y-6">
          {/* Statement Persistence Summary Card */}
          <div className="p-5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">{importData.filename}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {importData.parsed_row_count} Rows Stored in Database
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                SHA-256 Hash: {importData.file_hash?.slice(0, 24)}...
              </p>
            </div>

            {importData.reconciliation_data && (
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="text-slate-400">Total Credits</div>
                  <div className="text-emerald-400 font-medium">+₹{Number(importData.reconciliation_data.totalCredits || 0).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">Total Debits</div>
                  <div className="text-rose-400 font-medium">-₹{Number(importData.reconciliation_data.totalDebits || 0).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* AI Progress Tracker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                AI Classification Progress
              </span>
              <span className="text-slate-400 font-medium">
                {importData.activeRun?.completed_chunks || 0} of {importData.chunks?.length || 1} Chunks Processed
              </span>
            </div>

            {/* Chunk Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {importData.chunks && importData.chunks.map((chk: any) => (
                <div
                  key={chk.id}
                  className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        chk.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : chk.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400'
                          : chk.status === 'PROCESSING'
                          ? 'bg-indigo-500/10 text-indigo-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {chk.status === 'COMPLETED' ? (
                        <Check className="w-4 h-4" />
                      ) : chk.status === 'FAILED' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : chk.status === 'PROCESSING' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Cpu className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Chunk {chk.chunk_index} of {chk.total_chunks}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Rows {chk.source_row_start}–{chk.source_row_end} ({chk.row_count} transactions)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {chk.status === 'FAILED' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRetryChunk(chk.id, false)}
                          disabled={retryingChunkId === chk.id}
                          className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          {retryingChunkId === chk.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Retry
                        </button>
                        <button
                          onClick={() => handleRetryChunk(chk.id, true)}
                          disabled={retryingChunkId === chk.id}
                          title="Use deterministic classifier"
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-medium"
                        >
                          Fast Mode
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          chk.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {chk.status === 'PROCESSING' ? 'Analyzing...' : chk.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {importData.chunks?.some((c: any) => c.status === 'FAILED') && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300">
                <span>Some chunks encountered API latency or rate limits.</span>
                <button
                  onClick={handleFastInferenceFallback}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-semibold"
                >
                  Complete with Fast Inference
                </button>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              ← Upload Different File
            </button>

            <button
              onClick={() => loadReview(importData.id)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
            >
              Proceed to Review Layer
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: REVIEW & COMMIT */}
      {/* ========================================================= */}
      {step === 3 && importData && (
        <div className="space-y-6">
          {committedCount !== null ? (
            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Import Committed Successfully!</h3>
                <p className="text-sm text-emerald-300/80 mt-1">
                  Imported <span className="font-bold text-white">{committedCount}</span> confirmed transactions into your financial ledger.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Import Another Statement
                </button>
                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('transactions')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    View in Transactions
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Review Header & Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Review Transactions ({filteredResults.length} / {reviewResults.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify AI-assigned categories and transfer tags before committing to the ledger.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Type Filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Types</option>
                    <option value="EXPENSE">Expenses Only</option>
                    <option value="INCOME">Income Only</option>
                    <option value="TRANSFER">Transfers Only</option>
                  </select>

                  {/* Include Duplicates Checkbox */}
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700">
                    <input
                      type="checkbox"
                      checked={includeDuplicates}
                      onChange={(e) => setIncludeDuplicates(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Include duplicates</span>
                  </label>

                  {/* Confirm Button */}
                  <button
                    onClick={handleConfirm}
                    disabled={isCommitting || reviewResults.length === 0}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isCommitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Writing to Ledger...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Commit to Ledger
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Transactions Review Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/90 text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur z-10 border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">AI Merchant</th>
                        <th className="py-3 px-4">Assigned Category</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {filteredResults.map((item, idx) => {
                        const isIncome = item.direction === 'CREDIT' || item.transactionType === 'INCOME';
                        const currentCategoryId = rowOverrides[item.parsedRowId]?.category_id || item.suggestedCategoryId || '';
                        const currentType = rowOverrides[item.parsedRowId]?.transaction_type || item.transactionType || 'EXPENSE';

                        return (
                          <tr
                            key={item.parsedRowId}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              item.isDuplicate ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{item.date}</td>
                            <td className="py-3 px-4 max-w-xs truncate">
                              <div className="font-medium text-white">{item.description}</div>
                              {item.isDuplicate && (
                                <div className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  Duplicate ({item.duplicateReason})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={currentType}
                                onChange={(e) => handleTypeChange(item.parsedRowId, e.target.value)}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                              >
                                <option value="EXPENSE">Expense</option>
                                <option value="INCOME">Income</option>
                                <option value="TRANSFER">Transfer</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-medium">
                              {item.merchant}
                              {item.transferCandidate && (
                                <span className="ml-2 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px]">
                                  Transfer
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={currentCategoryId}
                                onChange={(e) => handleCategoryChange(item.parsedRowId, e.target.value)}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-indigo-500 min-w-[140px]"
                              >
                                <option value="">Select Category...</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.type})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span
                                className={`font-semibold flex items-center justify-end gap-1 ${
                                  isIncome ? 'text-emerald-400' : 'text-slate-200'
                                }`}
                              >
                                {isIncome ? (
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                {formatINR(item.amount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                >
                  ← Back to AI Status
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
