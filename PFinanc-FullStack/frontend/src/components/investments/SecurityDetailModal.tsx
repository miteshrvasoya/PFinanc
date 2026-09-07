import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  X,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  History,
  Coins,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface SecurityDetailModalProps {
  holding: any;
  onClose: () => void;
  onTrade: (security: any) => void;
}

export const SecurityDetailModal: React.FC<SecurityDetailModalProps> = ({
  holding,
  onClose,
  onTrade,
}) => {
  const [securityData, setSecurityData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [holding.security_id]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [secRes, txRes] = await Promise.all([
        api.getSecurity(holding.security_id),
        api.getInvestmentTransactions({ security_id: holding.security_id }),
      ]);

      if (secRes.success) setSecurityData(secRes.data);
      if (txRes.success && txRes.data) setTransactions(txRes.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isProfit = holding.unrealized_pnl >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-tight">{holding.symbol}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {holding.security_type} • {holding.exchange}
              </span>
              {holding.isin && (
                <span className="text-[11px] font-mono text-slate-400">ISIN: {holding.isin}</span>
              )}
            </div>
            <h4 className="text-sm text-slate-300 font-medium mt-0.5">{holding.name}</h4>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Valuation Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Price / NAV</span>
            <span className="text-lg font-bold text-white">{formatINR(holding.current_price)}</span>
            {holding.price_date && (
              <span className="text-[10px] text-slate-500 block">As of {formatDate(holding.price_date)}</span>
            )}
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Units / Shares</span>
            <span className="text-lg font-bold text-slate-200">
              {holding.current_quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
            </span>
            <span className="text-[10px] text-slate-500 block">Avg Cost: {formatINR(holding.average_cost)}</span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Market Value</span>
            <span className="text-lg font-extrabold text-white">{formatINR(holding.current_value)}</span>
            <span className="text-[10px] text-slate-500 block">Invested: {formatINR(holding.total_invested)}</span>
          </div>
          <div
            className={`glass-panel p-3.5 rounded-xl border ${
              isProfit ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Unrealized P&L</span>
            <span className={`text-lg font-extrabold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit ? '+' : ''}
              {formatINR(holding.unrealized_pnl)}
            </span>
            <span className={`text-[10px] font-bold ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
              ({isProfit ? '+' : ''}
              {holding.unrealized_pnl_percent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* FIFO Buy Lots Breakdown */}
        {holding.lots && holding.lots.length > 0 && (
          <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Active FIFO Tax Lots ({holding.lots.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 uppercase text-[9px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Acquisition Date</th>
                    <th className="py-2 px-3 text-right">Holding Units</th>
                    <th className="py-2 px-3 text-right">Lot Cost/Unit</th>
                    <th className="py-2 px-3 text-right">Cost Basis</th>
                    <th className="py-2 px-3 text-right">Current Value</th>
                    <th className="py-2 px-3 text-right">Lot P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {holding.lots.map((lot: any, idx: number) => {
                    const lotVal = lot.quantity * holding.current_price;
                    const lotPnL = lotVal - lot.totalCost;
                    const lotProfit = lotPnL >= 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-medium text-slate-300">{formatDate(lot.date)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-200">
                          {lot.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">{formatINR(lot.unitCost)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">{formatINR(lot.totalCost)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white">{formatINR(lotVal)}</td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            lotProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {lotProfit ? '+' : ''}
                          {formatINR(lotPnL)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Instrument Transaction History</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-slate-500 text-xs py-4 text-center">No transactions recorded.</p>
            ) : (
              transactions.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        t.transaction_type === 'BUY' || t.transaction_type === 'SIP'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : t.transaction_type === 'SELL'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-indigo-500/15 text-indigo-400'
                      }`}
                    >
                      {t.transaction_type}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-200">
                        {t.quantity ? `${t.quantity} units @ ${formatINR(t.price_per_unit)}` : 'Cash Distribution'}
                      </p>
                      <p className="text-[10px] text-slate-500">{formatDate(t.transaction_date)} • {t.account_name}</p>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold text-white">
                    {formatINR(t.net_amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 flex justify-between items-center border-t border-slate-800">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Realized P&L: <strong>{formatINR(holding.realized_pnl)}</strong></span>
            <span>Dividends: <strong>{formatINR(holding.total_dividends)}</strong></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onTrade(holding);
              }}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
            >
              Record Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
