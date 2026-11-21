import React from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardView, DashboardQuickAction } from '../components/dashboard/DashboardView';

export default function Home() {
  const router = useRouter();

  const handleQuickAction = (action: DashboardQuickAction) => {
    if (action === 'add_expense' || action === 'add_income') {
      router.push(`/transactions?action=${action}`);
    } else if (action === 'transfer') {
      router.push('/transfers?action=new');
    } else if (action === 'add_account') {
      router.push('/accounts');
    } else if (action === 'import_csv') {
      router.push('/imports');
    }
  };

  return (
    <AppLayout>
      <DashboardView
        onQuickAction={handleQuickAction}
        onNavigateToTab={(tab) => {
          if (tab === 'dashboard') router.push('/');
          else router.push(`/${tab}`);
        }}
      />
    </AppLayout>
  );
}
