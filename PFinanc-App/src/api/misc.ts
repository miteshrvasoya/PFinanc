import apiClient from './client';

export const householdsApi = {
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/households/${id}`);
    return data;
  },
  addMember: async (householdId: string, payload: { email: string; role: string; name?: string }) => {
    const { data } = await apiClient.post(`/households/${householdId}/members`, payload);
    return data;
  },
};

export const categoriesApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/categories');
    return data;
  },
};

export const onboardingApi = {
  getStatus: async () => {
    const { data } = await apiClient.get('/onboarding/status');
    return data;
  },
  updateStep: async (step: string, completedSection?: string, metadata?: any) => {
    const { data } = await apiClient.post('/onboarding/step', {
      step,
      completed_section: completedSection,
      metadata,
    });
    return data;
  },
  complete: async () => {
    const { data } = await apiClient.post('/onboarding/complete');
    return data;
  },
  skip: async () => {
    const { data } = await apiClient.post('/onboarding/skip');
    return data;
  },
};

export const importsApi = {
  previewCsv: async (accountId: string, fileUri: string, fileName: string, columnMapping?: any) => {
    const formData = new FormData();
    formData.append('account_id', accountId);
    formData.append('file', { uri: fileUri, name: fileName, type: 'text/csv' } as any);
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping));
    }
    const { data } = await apiClient.post('/imports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  commit: async (batchId: string, includeDuplicates = false) => {
    const { data } = await apiClient.post(`/imports/commit/${batchId}`, { include_duplicates: includeDuplicates });
    return data;
  },
};
