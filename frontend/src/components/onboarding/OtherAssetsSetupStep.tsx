import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  Coins,
  Building,
  ShieldCheck,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface OtherAssetsSetupStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const OtherAssetsSetupStep: React.FC<OtherAssetsSetupStepProps> = ({ onNext, onSkip }) => {
  const [activeSubTab, setActiveSubTab] = useState<'GOLD' | 'FD' | 'EPF' | 'PPF' | 'NPS'>('GOLD');

  const [goldAssets, setGoldAssets] = useState<any[]>([]);
  const [fds, setFds] = useState<any[]>([]);
  const [retirementAccs, setRetirementAccs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [goldForm, setGoldForm] = useState({
    asset_name: '24K Physical Gold',
    asset_type: 'PHYSICAL_GOLD',
    quantity: '25.5',
    unit: 'grams',
    purchase_cost: '120000',
    current_value: '210000',
    as_of_date: new Date().toISOString().split('T')[0],
  });

  const [fdForm, setFdForm] = useState({
    institution_name: 'State Bank of India',
    principal_amount: '100000',
    interest_rate: '7.25',
    compounding_frequency: 'QUARTERLY',
    start_date: new Date().toISOString().split('T')[0],
    maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [retForm, setRetForm] = useState({
    asset_type: 'EPF',
    institution_name: 'EPFO India',
    opening_balance: '450000',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goldRes, fdRes, retRes] = await Promise.all([
        api.getPhysicalAssets(),
        api.getFixedDeposits(),
        api.getRetirementAccounts(),
      ]);
      if (goldRes.success && goldRes.data) setGoldAssets(goldRes.data);
      if (fdRes.success && fdRes.data) setFds(fdRes.data);
      if (retRes.success && retRes.data) setRetirementAccs(retRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPhysicalAsset({
        asset_name: goldForm.asset_name,
        asset_type: goldForm.asset_type,
        quantity: parseFloat(goldForm.quantity) || 1,
        unit: goldForm.unit,
        purchase_cost: parseFloat(goldForm.purchase_cost) || 0,
        current_value: parseFloat(goldForm.current_value) || 0,
        as_of_date: goldForm.as_of_date,
      });
      if (res.success) {
        setGoldForm({
          asset_name: '',
          asset_type: 'PHYSICAL_GOLD',
          quantity: '',
          unit: 'grams',
          purchase_cost: '',
          current_value: '',
          as_of_date: new Date().toISOString().split('T')[0],
        });
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveFd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createFixedDeposit(fdForm);
      if (res.success) {
        setFdForm({
          institution_name: '',
          principal_amount: '',
          interest_rate: '7.25',
          compounding_frequency: 'QUARTERLY',
          start_date: new Date().toISOString().split('T')[0],
          maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveRetirement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createRetirementAccount(retForm);
      if (res.success) {
        setRetForm({
          asset_type: 'EPF',
          institution_name: '',
          opening_balance: '',
        });
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight">Step 4: Other Assets, FDs & Gold</h3>
        <p className="text-xs text-slate-400">
          Capture your guaranteed term deposits, retirement corpus (EPF, PPF, NPS), and physical precious metals.
        </p>
      </div>

      {/* Asset Category Selector Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: 'GOLD', label: 'Gold & Precious Metals', icon: Coins, count: goldAssets.length },
          { id: 'FD', label: 'Fixed Deposits', icon: Building, count: fds.length },
          { id: 'EPF', label: 'EPF (Provident Fund)', icon: ShieldCheck, count: retirementAccs.filter(r => r.asset_type === 'EPF').length },
          { id: 'PPF', label: 'PPF', icon: ShieldCheck, count: retirementAccs.filter(r => r.asset_type === 'PPF').length },
          { id: 'NPS', label: 'NPS (Pension)', icon: ShieldCheck, count: retirementAccs.filter(r => r.asset_type === 'NPS').length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[9px]">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Gold Asset Form */}
      {activeSubTab === 'GOLD' && (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-4 max-w-lg">
          <h4 className="font-bold text-white text-sm">Add Gold & Precious Metals</h4>
          <form onSubmit={handleSaveGold} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Asset Category</label>
                <select
                  value={goldForm.asset_type}
                  onChange={(e) => setGoldForm({ ...goldForm, asset_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="PHYSICAL_GOLD">Physical Gold (Coins / Jewellery)</option>
                  <option value="DIGITAL_GOLD">Digital Gold</option>
                  <option value="SGB">Sovereign Gold Bond (SGB)</option>
                  <option value="OTHER_ASSET">Other Tangible Asset</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Asset Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24K Gold Bar or SGB 2026"
                  value={goldForm.asset_name}
                  onChange={(e) => setGoldForm({ ...goldForm, asset_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Weight / Quantity</label>
                <input
                  type="number"
                  step="any"
                  placeholder="25.5"
                  value={goldForm.quantity}
                  onChange={(e) => setGoldForm({ ...goldForm, quantity: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Unit</label>
                <input
                  type="text"
                  placeholder="grams"
                  value={goldForm.unit}
                  onChange={(e) => setGoldForm({ ...goldForm, unit: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Purchase Cost Basis (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="120000"
                  value={goldForm.purchase_cost}
                  onChange={(e) => setGoldForm({ ...goldForm, purchase_cost: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Current Estimated Value (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="210000"
                  value={goldForm.current_value}
                  onChange={(e) => setGoldForm({ ...goldForm, current_value: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                Save Gold Asset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FD Form */}
      {activeSubTab === 'FD' && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-w-lg">
          <h4 className="font-bold text-white text-sm">Add Term Fixed Deposit</h4>
          <form onSubmit={handleSaveFd} className="space-y-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Bank / Institution *</label>
              <input
                type="text"
                required
                placeholder="e.g. State Bank of India"
                value={fdForm.institution_name}
                onChange={(e) => setFdForm({ ...fdForm, institution_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Principal Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="100000"
                  value={fdForm.principal_amount}
                  onChange={(e) => setFdForm({ ...fdForm, principal_amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Interest Rate (% p.a.) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="7.25"
                  value={fdForm.interest_rate}
                  onChange={(e) => setFdForm({ ...fdForm, interest_rate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Save Fixed Deposit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Retirement Forms (EPF/PPF/NPS) */}
      {['EPF', 'PPF', 'NPS'].includes(activeSubTab) && (
        <div className="glass-panel p-6 rounded-2xl border border-pink-500/30 space-y-4 max-w-lg">
          <h4 className="font-bold text-white text-sm">Add {activeSubTab} Account</h4>
          <form onSubmit={handleSaveRetirement} className="space-y-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Institution / Scheme *</label>
              <input
                type="text"
                required
                placeholder={activeSubTab === 'EPF' ? 'EPFO Corporate' : activeSubTab === 'PPF' ? 'SBI PPF' : 'NSDL NPS'}
                value={retForm.institution_name}
                onChange={(e) => setRetForm({ ...retForm, asset_type: activeSubTab, institution_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Current Balance / Corpus (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="450000"
                value={retForm.opening_balance}
                onChange={(e) => setRetForm({ ...retForm, asset_type: activeSubTab, opening_balance: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none font-bold"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold"
              >
                Save {activeSubTab} Account
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
          Skip Other Assets for Now
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
        >
          <span>Review & Finish Setup</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
