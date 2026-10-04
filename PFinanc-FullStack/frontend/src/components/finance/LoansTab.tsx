import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Banknote, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

export const LoansTab: React.FC = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      const res = await api.getLoans();
      if (res.success) {
        setLoans(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading loans and debts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Loans & Debt</h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all">
          <Plus className="w-4 h-4" />
          Add Record
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800">
          <Banknote className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h4 className="text-white font-bold text-lg mb-2">No Active Loans</h4>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Keep track of money you borrowed or money you lent to others. Manage EMIs and outstanding balances.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loans.map((l) => (
            <div key={l.id} className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-base">{l.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.loan_type.includes('LENT') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {l.loan_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">{l.counterparty ? `Counterparty: ${l.counterparty}` : 'No counterparty specified'}</p>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Principal</span>
                    <span className="text-sm font-bold text-slate-300">{formatINR(l.principal_amount)}</span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Outstanding</span>
                    <span className={`text-sm font-bold ${l.loan_type.includes('LENT') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatINR(l.outstanding_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {l.emi_amount && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">EMI / Payment</span>
                  <span className="text-sm font-bold text-white">{formatINR(l.emi_amount)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
