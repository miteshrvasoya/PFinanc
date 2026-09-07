import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { CategoriesView } from '../components/categories/CategoriesView';

export default function CategoriesPage() {
  return (
    <AppLayout>
      <CategoriesView />
    </AppLayout>
  );
}
