import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { AccountsView } from '../components/accounts/AccountsView';

export default function AccountsPage() {
  return (
    <AppLayout>
      <AccountsView />
    </AppLayout>
  );
}
