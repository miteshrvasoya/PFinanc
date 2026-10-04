import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Home, Plus, RefreshCw } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

export const RentTab: React.FC = () => {
  const [rentAgreements, setRentAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRent = async () => {
    try {
      const res = await api.getRent();
      if (res.success) {
        setRentAgreements(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRent();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading rent agreements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Rent Management</h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all">
          <Plus className="w-4 h-4" />
          Add Agreement
        </button>
      </div>

      {rentAgreements.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800">
          <Home className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h4 className="text-white font-bold text-lg mb-2">No Rent Configured</h4>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Add rent you pay for your house/office or rental income you receive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rentAgreements.map((r) => (
            <div key={r.id} className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-base">{r.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.rent_type === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {r.rent_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">{r.property_name ? r.property_name : 'No property specified'}</p>
                
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-2xl font-black ${r.rent_type === 'RECEIVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatINR(r.amount)}
                  </span>
                  <span className="text-xs font-medium text-slate-500 mb-1">/ {r.frequency.toLowerCase()}</span>
                </div>
                {r.counterparty && (
                  <p className="text-xs text-slate-500 mt-2">
                    {r.rent_type === 'PAID' ? 'To: ' : 'From: '} {r.counterparty}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
