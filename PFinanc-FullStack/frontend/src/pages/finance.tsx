import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { FinanceView } from '../components/finance/FinanceView';

export default function Finance() {
  return (
    <AppLayout>
      <FinanceView />
    </AppLayout>
  );
}
