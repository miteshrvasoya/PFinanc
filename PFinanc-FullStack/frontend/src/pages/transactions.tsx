import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '../components/layout/AppLayout';
import { TransactionsView } from '../components/transactions/TransactionsView';

export default function TransactionsPage() {
  const router = useRouter();
  const [initialAction, setInitialAction] = useState<'add_expense' | 'add_income' | null>(null);

  useEffect(() => {
    if (router.isReady) {
      const action = router.query.action;
      if (action === 'add_expense' || action === 'add_income') {
        setInitialAction(action as any);
      }
    }
  }, [router.isReady, router.query.action]);

  const handleClearAction = () => {
    setInitialAction(null);
    // Remove query parameter without reloading
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('action');
    router.replace(newUrl.pathname + newUrl.search, undefined, { shallow: true });
  };

  return (
    <AppLayout>
      <TransactionsView
        initialAction={initialAction}
        onClearInitialAction={handleClearAction}
      />
    </AppLayout>
  );
}
