import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { InvestmentsView } from '../components/investments/InvestmentsView';

export default function InvestmentsPage() {
  return (
    <AppLayout>
      <InvestmentsView />
    </AppLayout>
  );
}
