import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  X,
} from 'lucide-react';

interface TransactionsViewProps {
  initialAction?: 'add_expense' | 'add_income' | null;
  onClearInitialAction?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ initialAction, onClearInitialAction }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add Transaction Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    transaction_type: 'EXPENSE',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    merchant_name: '',
    status: 'CONFIRMED',
    notes: '',
  });

  useEffect(() => {
    if (initialAction === 'add_expense') {
      setFormData((prev) => ({ ...prev, transaction_type: 'EXPENSE' }));
      setShowAddModal(true);
      if (onClearInitialAction) onClearInitialAction();
    } else if (initialAction === 'add_income') {
      setFormData((prev) => ({ ...prev, transaction_type: 'INCOME' }));
      setShowAddModal(true);
      if (onClearInitialAction) onClearInitialAction();
    }
  }, [initialAction]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        api.getTransactions({
          search,
          account_id: selectedAccountId,
          type: selectedType,
          status: selectedStatus,
          start_date: startDate,
          end_date: endDate,
        }),
        api.getAccounts(),
        api.getCategories(),
      ]);

      if (txRes.success && txRes.data) {
        setTransactions(txRes.data.items);
        setTotalCount(txRes.data.total);
      }
      if (accRes.success && accRes.data) {
        setAccounts(accRes.data);
        if (!formData.account_id && accRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, account_id: accRes.data[0].id }));
        }
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedAccountId, selectedType, selectedStatus, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || null,
      });

      if (res.success) {
        setShowAddModal(false);
        setFormData({
          account_id: accounts[0]?.id || '',
          category_id: '',
          transaction_type: 'EXPENSE',
          amount: '',
          transaction_date: new Date().toISOString().split('T')[0],
          description: '',
          merchant_name: '',
          status: 'CONFIRMED',
          notes: '',
        });
        loadData();
      } else {
        alert(res.error?.message || 'Failed to create transaction');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating transaction');
    }
  };

  const handleSetStatus = async (txId: string, status: 'confirm' | 'void') => {
    try {
      if (status === 'confirm') await api.confirmTransaction(txId);
      if (status === 'void') await api.voidTransaction(txId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Ledger Transactions</h2>
          <p className="text-sm text-slate-400">Complete auditable transaction records across all family accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, merchant, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Account Filter */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full md:w-48 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.owner_name})
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full md:w-36 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
            <option value="TRANSFER">Transfer</option>
            <option value="REFUND">Refund</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-36 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DRAFT">Draft</option>
            <option value="VOID">Void</option>
          </select>

          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Transaction Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading Transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No transactions found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description & Merchant</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => {
                  const isIncome = tx.transaction_type === 'INCOME' || tx.transaction_type === 'REFUND';
                  const isTransfer = tx.transaction_type === 'TRANSFER';
                  const isVoid = tx.status === 'VOID';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isVoid ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-medium whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{tx.description}</div>
                        {tx.merchant_name && (
                          <div className="text-[11px] text-slate-400">{tx.merchant_name}</div>
                        )}
                        {tx.external_reference && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {tx.external_reference}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-300">{tx.account_name}</span>
                        <span className="text-[10px] text-slate-500 block">{tx.user_name}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.category_name ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              backgroundColor: `${tx.category_color || '#6366f1'}15`,
                              color: tx.category_color || '#a5b4fc',
                              border: `1px solid ${tx.category_color || '#6366f1'}30`,
                            }}
                          >
                            {tx.category_name}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isTransfer
                              ? 'text-indigo-300'
                              : isIncome
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {isTransfer ? '' : isIncome ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                        <span className="text-[10px] text-slate-500 block uppercase font-mono">
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : tx.status === 'DRAFT'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {tx.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSetStatus(tx.id, 'confirm')}
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                              title="Confirm Transaction"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {tx.status !== 'VOID' && (
                            <button
                              onClick={() => handleSetStatus(tx.id, 'void')}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                              title="Void Transaction"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Record Financial Transaction</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-3.5 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transaction_type: 'EXPENSE' })}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    formData.transaction_type === 'EXPENSE'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Expense
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transaction_type: 'INCOME' })}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    formData.transaction_type === 'INCOME'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Income
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Account *</label>
                <select
                  required
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.owner_name}) • Balance: {formatINR(a.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy Dinner, Salary Credit, Electricity Bill"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <React.Fragment key={c.id}>
                        <option value={c.id}>{c.name}</option>
                        {c.children?.map((child: any) => (
                          <option key={child.id} value={child.id}>
                            &nbsp;&nbsp;↳ {child.name}
                          </option>
                        ))}
                      </React.Fragment>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Merchant / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. Swiggy, Amazon, D-Mart"
                    value={formData.merchant_name}
                    onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/20"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
