import apiClient from './client';

export const transfersApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/transfers');
    return data;
  },
  create: async (payload: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    date: string;
    notes?: string;
  }) => {
    const { data } = await apiClient.post('/transfers', payload);
    return data;
  },
  void: async (id: string) => {
    const { data } = await apiClient.post(`/transfers/${id}/void`);
    return data;
  },
};
