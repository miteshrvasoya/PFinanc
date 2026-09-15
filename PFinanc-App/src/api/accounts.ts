import apiClient from './client';

export const accountsApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/accounts');
    return data;
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/accounts/${id}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post('/accounts', payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/accounts/${id}`, payload);
    return data;
  },
  toggleArchive: async (id: string) => {
    const { data } = await apiClient.post(`/accounts/${id}/toggle-archive`);
    return data;
  },
};
