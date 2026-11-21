import { apiClient } from './client';

export interface VaultItem {
  _id: string;
  category: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export const vaultApi = {
  getItems: async (): Promise<VaultItem[]> => {
    const res = await apiClient.get('/api/vault');
    if (res.success) {
      return res.data;
    }
    throw new Error('Failed to fetch vault items');
  },

  createItem: async (data: Partial<VaultItem>): Promise<VaultItem> => {
    const res = await apiClient.post('/api/vault', data);
    if (res.success) {
      return res.data;
    }
    throw new Error('Failed to create vault item');
  },

  updateItem: async (id: string, data: Partial<VaultItem>): Promise<VaultItem> => {
    const res = await apiClient.put(`/api/vault/${id}`, data);
    if (res.success) {
      return res.data;
    }
    throw new Error('Failed to update vault item');
  },

  deleteItem: async (id: string): Promise<void> => {
    const res = await apiClient.delete(`/api/vault/${id}`);
    if (!res.success) {
      throw new Error('Failed to delete vault item');
    }
  }
};
