import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '../components/layout/AppLayout';
import { TransfersView } from '../components/transfers/TransfersView';

export default function TransfersPage() {
  const router = useRouter();
  const [initialOpen, setInitialOpen] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      if (router.query.action === 'new') {
        setInitialOpen(true);
      }
    }
  }, [router.isReady, router.query.action]);

  const handleClearOpen = () => {
    setInitialOpen(false);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('action');
    router.replace(newUrl.pathname + newUrl.search, undefined, { shallow: true });
  };

  return (
    <AppLayout>
      <TransfersView
        initialOpen={initialOpen}
        onClearInitialOpen={handleClearOpen}
      />
    </AppLayout>
  );
}
