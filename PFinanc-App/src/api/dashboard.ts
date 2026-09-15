import apiClient from './client';

export const dashboardApi = {
  getSummary: async (view: 'household' | 'personal' = 'household') => {
    const { data } = await apiClient.get(`/dashboard?view=${view}`);
    return data;
  },
  getMonthlyTrends: async (months = 6) => {
    const { data } = await apiClient.get(`/analytics/trends?months=${months}`);
    return data;
  },
  getCategoryAnalytics: async (type: 'EXPENSE' | 'INCOME' = 'EXPENSE', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ type });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const { data } = await apiClient.get(`/analytics/categories?${params}`);
    return data;
  },
  getFamilyAnalytics: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const { data } = await apiClient.get(`/analytics/family?${params}`);
    return data;
  },
};
