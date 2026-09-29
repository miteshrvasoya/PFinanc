import apiClient from './client';

export const transactionsApi = {
  getAll: async (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    const { data } = await apiClient.get(`/transactions?${q}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post('/transactions', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/transactions/${id}`, payload);
    return data;
  },
  confirm: async (id: string) => {
    const { data } = await apiClient.post(`/transactions/${id}/confirm`);
    return data;
  },
  reject: async (id: string) => {
    const { data } = await apiClient.post(`/transactions/${id}/reject`);
    return data;
  },
  void: async (id: string) => {
    const { data } = await apiClient.post(`/transactions/${id}/void`);
    return data;
  },
};
