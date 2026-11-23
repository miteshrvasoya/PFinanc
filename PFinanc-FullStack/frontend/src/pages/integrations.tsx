import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { AngelOnePanel } from '../components/integrations/AngelOnePanel';

export default function Integrations() {
  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Integrations</h1>
          <p className="text-sm text-slate-400 mt-1">Connect brokers and data sources to keep your portfolio up to date automatically.</p>
        </div>
        <AngelOnePanel />
      </div>
    </AppLayout>
  );
}
