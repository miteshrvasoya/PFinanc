import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

export const ClassifyTransactionModal: React.FC<{
  transaction: any;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ transaction, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [loans, setLoans] = useState<any[]>([]);
  const [rentAgreements, setRentAgreements] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    transaction_type: transaction.transaction_type,
    linked_entity_type: transaction.linked_entity_type || '',
    linked_entity_id: transaction.linked_entity_id || '',
  });

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [loansRes, rentRes] = await Promise.all([
        api.getLoans(),
        api.getRent()
      ]);
      if (loansRes.success) setLoans(loansRes.data);
      if (rentRes.success) setRentAgreements(rentRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        transaction_type: formData.transaction_type,
      };

      if (formData.linked_entity_type && formData.linked_entity_id) {
        payload.linked_entity_type = formData.linked_entity_type;
        payload.linked_entity_id = formData.linked_entity_id;
      } else {
        payload.linked_entity_type = null;
        payload.linked_entity_id = null;
      }

      const res = await api.updateTransaction(transaction.id, payload);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error?.message || 'Failed to classify transaction');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isIncome = transaction.amount > 0 && transaction.transaction_type !== 'EXPENSE'; // Simplified assumption based on amounts if we used signed amounts, but wait: PFinanc uses unsigned amounts + transaction_type.
  
  const renderLinkSelect = () => {
    if (formData.linked_entity_type === 'LOAN') {
      return (
        <select
          required
          value={formData.linked_entity_id}
          onChange={(e) => setFormData({ ...formData, linked_entity_id: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
        >
          <option value="">Select a Loan/Debt...</option>
          {loans.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.loan_type.replace(/_/g, ' ')})</option>
          ))}
        </select>
      );
    }
    
    if (formData.linked_entity_type === 'RENT') {
      return (
        <select
          required
          value={formData.linked_entity_id}
          onChange={(e) => setFormData({ ...formData, linked_entity_id: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
        >
          <option value="">Select a Rent Agreement...</option>
          {rentAgreements.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.rent_type})</option>
          ))}
        </select>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Classify Transaction</h3>
            <p className="text-xs text-slate-400 mt-1">{transaction.description}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {dataLoading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Financial Context</label>
              <select
                value={formData.transaction_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const newFormData = { ...formData, transaction_type: type };
                  
                  // Auto-set linked entity type based on context
                  if (['LOAN_DISBURSEMENT', 'EMI_PAYMENT', 'LENT_AMOUNT', 'LENT_PRINCIPAL_RECEIVED', 'LENT_INTEREST_RECEIVED', 'BORROWED_AMOUNT', 'BORROWED_PRINCIPAL_REPAID', 'BORROWED_INTEREST_PAID'].includes(type)) {
                    newFormData.linked_entity_type = 'LOAN';
                  } else if (['RENT_PAID', 'RENT_RECEIVED'].includes(type)) {
                    newFormData.linked_entity_type = 'RENT';
                  } else {
                    newFormData.linked_entity_type = '';
                    newFormData.linked_entity_id = '';
                  }
                  
                  setFormData(newFormData);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <optgroup label="Standard">
                  <option value="EXPENSE">Regular Expense</option>
                  <option value="INCOME">Regular Income</option>
                  <option value="TRANSFER">Transfer</option>
                </optgroup>
                <optgroup label="Debt & Loans">
                  <option value="LOAN_DISBURSEMENT">Loan Disbursement (Received)</option>
                  <option value="EMI_PAYMENT">EMI / Loan Repayment (Paid)</option>
                  <option value="BORROWED_AMOUNT">Money Borrowed (Received)</option>
                  <option value="BORROWED_PRINCIPAL_REPAID">Borrowed Principal Repaid (Paid)</option>
                  <option value="LENT_AMOUNT">Money Lent (Paid)</option>
                  <option value="LENT_PRINCIPAL_RECEIVED">Lent Principal Received (Received)</option>
                </optgroup>
                <optgroup label="Rent">
                  <option value="RENT_PAID">Rent Paid</option>
                  <option value="RENT_RECEIVED">Rent Received</option>
                </optgroup>
                <optgroup label="Investments">
                  <option value="INVESTMENT_PURCHASE">Investment Purchase</option>
                  <option value="INVESTMENT_REDEMPTION">Investment Redemption</option>
                  <option value="INVESTMENT_INCOME">Investment Income (Dividend, etc.)</option>
                </optgroup>
              </select>
            </div>

            {formData.linked_entity_type && (
              <div className="bg-slate-900/50 p-3 rounded-xl border border-indigo-500/20">
                <label className="block text-indigo-300 font-medium mb-1">
                  Link to {formData.linked_entity_type.toLowerCase()} record
                </label>
                {renderLinkSelect()}
                {!formData.linked_entity_id && (
                  <p className="text-[10px] text-amber-500 mt-1 mt-2">
                    Please select a record to link, or create one in the Finance tab first.
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (formData.linked_entity_type && !formData.linked_entity_id)}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                {loading ? 'Saving...' : 'Apply Classification'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
