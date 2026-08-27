import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import { UniversalImportReview } from './UniversalImportReview';
import {
  Wallet,
  Plus,
  UploadCloud,
  CheckCircle2,
  Building,
  ArrowRight,
  Sparkles,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';

interface BankSetupStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const BankSetupStep: React.FC<BankSetupStepProps> = ({ onNext, onSkip }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Account State
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeCreatedAccount, setActiveCreatedAccount] = useState<any>(null);
  const [subAction, setSubAction] = useState<'CHOICE' | 'CSV' | 'BALANCE' | null>(null);

  // Form State
  const [accountForm, setAccountForm] = useState({
    name: '',
    institution_name: '',
    account_type: 'BANK',
    account_number: '',
    currency: 'INR',
  });

  // Current Balance State
  const [balanceData, setBalanceData] = useState({
    current_balance: '',
    as_of_date: new Date().toISOString().split('T')[0],
  });

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [parsingCsv, setParsingCsv] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, catRes] = await Promise.all([api.getAccounts(), api.getCategories()]);
      if (accRes.success && accRes.data) {
        const banks = accRes.data.filter((a: any) =>
          ['BANK', 'CASH', 'WALLET'].includes(a.account_type)
        );
        setAccounts(banks);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAccount({
        name: accountForm.name,
        institution_name: accountForm.institution_name,
        account_type: accountForm.account_type,
        account_number: accountForm.account_number,
        currency: accountForm.currency,
        opening_balance: 0.00,
      });

      if (res.success && res.data) {
        setActiveCreatedAccount(res.data);
        setShowAddForm(false);
        setSubAction('CHOICE');
        loadData();
      } else {
        alert(res.error?.message || 'Failed to create bank account');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    }
  };

  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCreatedAccount) return;

    try {
      const bal = parseFloat(balanceData.current_balance) || 0;
      const res = await api.updateAccount(activeCreatedAccount.id, {
        opening_balance: bal,
        opening_balance_date: balanceData.as_of_date,
      });

      if (res.success) {
        setSubAction(null);
        setActiveCreatedAccount(null);
        setBalanceData({ current_balance: '', as_of_date: new Date().toISOString().split('T')[0] });
        loadData();
      } else {
        alert(res.error?.message || 'Failed to update balance');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving balance');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeCreatedAccount) {
      const file = e.target.files[0];
      setParsingCsv(true);
      try {
        const res = await api.previewCsv(activeCreatedAccount.id, file);
        if (res.success && res.data) {
          setPreviewData(res.data);
        } else {
          alert(res.error?.message || 'Failed to preview CSV statement');
        }
      } catch (err: any) {
        alert(err.message || 'Error uploading file');
      } finally {
        setParsingCsv(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight">Step 1: Bank & Cash Accounts</h3>
        <p className="text-xs text-slate-400">
          Add your primary savings, current, cash, and digital wallet accounts to establish your baseline liquidity.
        </p>
      </div>

      {/* CSV Review Overlay */}
      {previewData && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">Review Statement Transactions</h4>
            <span className="text-xs text-indigo-400 font-mono">{previewData.filename}</span>
          </div>
          <UniversalImportReview
            previewData={previewData}
            categories={categories}
            onSuccess={() => {
              setPreviewData(null);
              setSubAction(null);
              setActiveCreatedAccount(null);
              loadData();
            }}
            onCancel={() => setPreviewData(null)}
          />
        </div>
      )}

      {/* Current Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">{acc.name}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-400">
                {acc.account_type}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {acc.institution_name || 'Bank'} • {acc.account_number_masked || 'XXXX'}
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Balance:</span>
              <span className="font-extrabold text-white text-sm">{formatINR(acc.current_balance)}</span>
            </div>
          </div>
        ))}

        {!showAddForm && !subAction && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="p-5 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-slate-900/60 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-indigo-600/20 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 mb-1 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs">+ Add Bank Account</span>
          </button>
        )}
      </div>

      {/* Add Bank Account Modal Form */}
      {showAddForm && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-w-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">Add Bank / Cash Account</h4>
            <button onClick={() => setShowAddForm(false)} className="text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Nickname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Salary, SBI Main"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bank / Institution</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI"
                  value={accountForm.institution_name}
                  onChange={(e) => setAccountForm({ ...accountForm, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Type</label>
                <select
                  value={accountForm.account_type}
                  onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="BANK">Savings / Current Bank</option>
                  <option value="CASH">Physical Cash</option>
                  <option value="WALLET">Digital Wallet (Paytm/Amazon Pay)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Last 4 Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="1234"
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Choice Modal (After Account Created) */}
      {subAction === 'CHOICE' && activeCreatedAccount && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/40 bg-indigo-500/5 space-y-4 max-w-lg">
          <div>
            <h4 className="font-bold text-white text-base">
              How would you like to set up {activeCreatedAccount.name}?
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Choose whether to upload historical bank statements or start directly from your current balance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Choice 1: Upload CSV */}
            <button
              type="button"
              onClick={() => {
                setSubAction('CSV');
                fileInputRef.current?.click();
              }}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-left space-y-2 group transition-all"
            >
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-white group-hover:text-indigo-300">Upload Bank Statement CSV</h5>
              <p className="text-[11px] text-slate-400 leading-tight">
                Import historical transactions with auto-categorization and duplicate detection.
              </p>
            </button>

            {/* Choice 2: Current Balance */}
            <button
              type="button"
              onClick={() => setSubAction('BALANCE')}
              className="p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-left space-y-2 group transition-all"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit">
                <DollarSign className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-white group-hover:text-emerald-300">Enter Current Balance</h5>
              <p className="text-[11px] text-slate-400 leading-tight">
                Quickly establish starting balance as an opening position without fake transactions.
              </p>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSubAction(null);
                setActiveCreatedAccount(null);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Skip Balance Entry (Set Later)
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Enter Current Balance Form */}
      {subAction === 'BALANCE' && activeCreatedAccount && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-4 max-w-md">
          <h4 className="font-bold text-white text-sm">
            Enter Current Balance for {activeCreatedAccount.name}
          </h4>

          <form onSubmit={handleSaveOpeningBalance} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Current Balance (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="85000.00"
                value={balanceData.current_balance}
                onChange={(e) => setBalanceData({ ...balanceData, current_balance: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-base font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Balance Effective Date *</label>
              <input
                type="date"
                required
                value={balanceData.as_of_date}
                onChange={(e) => setBalanceData({ ...balanceData, as_of_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <p className="text-[10px] text-slate-500">
              ✓ <strong>Invariant Guarantee</strong>: This starting balance will establish your net worth without generating artificial salary income or expenses.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubAction('CHOICE')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Save Opening Balance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-slate-400 hover:text-slate-200 font-medium"
        >
          Skip Bank Accounts for Now
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
        >
          <span>Continue to Stock & Broker Accounts</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
