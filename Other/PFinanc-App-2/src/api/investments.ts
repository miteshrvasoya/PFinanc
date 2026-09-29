import apiClient from './client';

export const investmentsApi = {
  getPortfolioSummary: async (view: 'household' | 'personal' = 'household') => {
    const { data } = await apiClient.get(`/investments/portfolio?view=${view}`);
    return data;
  },
  getHoldings: async (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    const { data } = await apiClient.get(`/investments/portfolio/holdings?${q}`);
    return data;
  },
  getSnapshots: async (range = '6M') => {
    const { data } = await apiClient.get(`/investments/portfolio/snapshots?range=${range}`);
    return data;
  },
  getFixedDeposits: async () => {
    const { data } = await apiClient.get('/investments/fixed-deposits');
    return data;
  },
  getPhysicalAssets: async () => {
    const { data } = await apiClient.get('/physical-assets');
    return data;
  },
  getRetirementAccounts: async () => {
    const { data } = await apiClient.get('/investments/retirement');
    return data;
  },
};
