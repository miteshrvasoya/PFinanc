import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  X,
  TrendingUp,
  Search,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface RecordTradeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialType?: string;
  initialSecurity?: any;
}

export const RecordTradeModal: React.FC<RecordTradeModalProps> = ({
  onClose,
  onSuccess,
  initialType = 'BUY',
  initialSecurity = null,
}) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSecurity, setSelectedSecurity] = useState<any>(initialSecurity);
  const [isSearching, setIsSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    transaction_type: initialType,
    investment_account_id: '',
    funding_account_id: '',
    dividend_account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    quantity: '',
    price_per_unit: '',
    fees: '0',
    taxes: '0',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.getAccounts();
      if (res.success && res.data) {
        const invAccs = res.data.filter((a: any) =>
          ['BROKERAGE', 'MUTUAL_FUND', 'OTHER'].includes(a.account_type)
        );
        const banks = res.data.filter((a: any) =>
          ['BANK', 'CASH', 'WALLET'].includes(a.account_type)
        );

        setAccounts(invAccs.length > 0 ? invAccs : res.data);
        setBankAccounts(banks);

        if (invAccs.length > 0) {
          setFormData((prev) => ({ ...prev, investment_account_id: invAccs[0].id }));
        } else if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, investment_account_id: res.data[0].id }));
        }

        if (banks.length > 0) {
          setFormData((prev) => ({
            ...prev,
            funding_account_id: banks[0].id,
            dividend_account_id: banks[0].id,
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.searchSecurities(query);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSecurity = (sec: any) => {
    setSelectedSecurity(sec);
    setSearchQuery(sec.name);
    setSearchResults([]);
    if (sec.latest_price) {
      setFormData((prev) => ({
        ...prev,
        price_per_unit: String(sec.latest_price),
      }));
    }
  };

  const qty = parseFloat(formData.quantity) || 0;
  const price = parseFloat(formData.price_per_unit) || 0;
  const fees = parseFloat(formData.fees) || 0;
  const taxes = parseFloat(formData.taxes) || 0;
  const gross = qty * price;

  let net = gross;
  if (formData.transaction_type === 'BUY' || formData.transaction_type === 'SIP') {
    net = gross + fees + taxes;
  } else if (formData.transaction_type === 'SELL' || formData.transaction_type === 'REDEMPTION') {
    net = Math.max(0, gross - fees - taxes);
  } else if (formData.transaction_type === 'DIVIDEND') {
    net = Math.max(0, (parseFloat(formData.quantity) || gross) - taxes);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.investment_account_id) {
      alert('Please select an investment account');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        investment_account_id: formData.investment_account_id,
        security_id: selectedSecurity?.id || null,
        transaction_type: formData.transaction_type,
        transaction_date: formData.transaction_date,
        quantity: qty > 0 ? qty : null,
        price_per_unit: price > 0 ? price : null,
        gross_amount: gross > 0 ? gross : net,
        fees,
        taxes,
        net_amount: net,
        reference: formData.reference || null,
        notes: formData.notes || null,
      };

      if (formData.transaction_type === 'BUY' || formData.transaction_type === 'SIP') {
        payload.funding_account_id = formData.funding_account_id || null;
      } else if (formData.transaction_type === 'DIVIDEND') {
        payload.dividend_account_id = formData.dividend_account_id || null;
      }

      const res = await api.createInvestmentTransaction(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        alert(res.error?.message || 'Failed to record investment trade');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording trade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Record Investment Trade</h3>
              <p className="text-xs text-slate-400">Track buy, sell, SIP, dividends, and corporate actions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Action Type Tabs */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Action Type</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
              {['BUY', 'SELL', 'SIP', 'DIVIDEND'].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({ ...formData, transaction_type: type })}
                  className={`py-2 rounded-lg font-bold text-center transition-all ${
                    formData.transaction_type === type
                      ? type === 'BUY' || type === 'SIP'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : type === 'SELL'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Security Search Picker */}
          <div className="relative">
            <label className="block text-slate-300 font-medium mb-1">
              Select Security / Instrument *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Symbol (e.g. RELIANCE, TCS) or Mutual Fund Name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Live Search Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-800">
                {searchResults.map((sec) => (
                  <div
                    key={sec.id}
                    onClick={() => handleSelectSecurity(sec)}
                    className="p-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-white text-xs">{sec.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {sec.symbol} • {sec.exchange} • {sec.security_type}
                      </p>
                    </div>
                    {sec.latest_price && (
                      <span className="text-emerald-400 font-bold">{formatINR(sec.latest_price)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedSecurity && (
              <div className="mt-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-indigo-300">
                <span className="font-semibold text-xs">
                  Selected: {selectedSecurity.name} ({selectedSecurity.symbol})
                </span>
                {selectedSecurity.latest_price && (
                  <span className="text-xs font-bold text-white">
                    CMP: {formatINR(selectedSecurity.latest_price)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Holding Account (Broker/Folio) *
              </label>
              <select
                required
                value={formData.investment_account_id}
                onChange={(e) => setFormData({ ...formData, investment_account_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.owner_name})
                  </option>
                ))}
              </select>
            </div>

            {(formData.transaction_type === 'BUY' || formData.transaction_type === 'SIP') && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Fund From Bank Account (Optional)
                </label>
                <select
                  value={formData.funding_account_id}
                  onChange={(e) => setFormData({ ...formData, funding_account_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Cash Linkage (Already Funded)</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Bal: {formatINR(b.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.transaction_type === 'DIVIDEND' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Deposit Dividend To Bank
                </label>
                <select
                  value={formData.dividend_account_id}
                  onChange={(e) => setFormData({ ...formData, dividend_account_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Do Not Record Cash Deposit</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Trade Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {formData.transaction_type === 'DIVIDEND' ? 'Total Dividend (₹)' : 'Quantity / Units *'}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 20 or 42.3011"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {formData.transaction_type !== 'DIVIDEND' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Price / NAV (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1520.00"
                  value={formData.price_per_unit}
                  onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Trade Date</label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Fees & Taxes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Brokerage & Fees (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fees}
                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">STT & Taxes (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.taxes}
                onChange={(e) => setFormData({ ...formData, taxes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Invariant Accounting Summary Callout */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gross Trade Value:</span>
              <span className="font-semibold text-white">{formatINR(gross)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Brokerage & Taxes:</span>
              <span className="text-slate-300">+{formatINR(fees + taxes)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="font-bold text-indigo-300">Total Net Cash Impact:</span>
              <span className="font-extrabold text-sm text-emerald-400">{formatINR(net)}</span>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              ✓ <strong>Accounting Guarantee</strong>: This purchase reallocates asset value from cash to investments and will NEVER be counted as a household expense.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold shadow-md shadow-indigo-500/20"
            >
              {submitting ? 'Recording Trade...' : `Confirm ${formData.transaction_type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
