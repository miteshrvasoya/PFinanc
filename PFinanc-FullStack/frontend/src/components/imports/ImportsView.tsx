import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatementPipelineView } from './StatementPipelineView';
import { RefreshCw, CreditCard, PlusCircle } from 'lucide-react';

interface ImportsViewProps {
  onNavigateToTab?: (tab: any) => void;
}

export const ImportsView: React.FC<ImportsViewProps> = ({ onNavigateToTab }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getAccounts();
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error('Failed to load accounts for CSV import:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-3" />
        <span className="font-semibold text-sm">Loading accounts...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-xl my-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
          <CreditCard className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">No Bank Accounts Found</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            You need at least one bank account in your household before uploading and parsing bank statements.
          </p>
        </div>
        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('accounts')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Bank Account First</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800/80">
        <h2 className="text-2xl font-bold text-white tracking-tight">Statement & CSV Import</h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload bank statements (HDFC, SBI, ICICI, Axis, Kotak, Zerodha, etc.) with deterministic DB storage and automated AI categorization.
        </p>
      </div>

      {/* Dedicated AI Statement Pipeline */}
      <StatementPipelineView
        accounts={accounts}
        onImportComplete={loadAccounts}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
