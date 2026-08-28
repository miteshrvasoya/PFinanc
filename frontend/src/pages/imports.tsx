import React from 'react';
import { useRouter } from 'next/router';
import { AppLayout } from '../components/layout/AppLayout';
import { ImportsView } from '../components/imports/ImportsView';

export default function ImportsPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <ImportsView onNavigateToTab={(tab) => router.push(`/${tab}`)} />
    </AppLayout>
  );
}
