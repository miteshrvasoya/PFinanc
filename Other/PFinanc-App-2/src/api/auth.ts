import apiClient, { tokenStorage } from './client';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; household_name?: string; }

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post('/auth/login', payload);
    return data; // { success, data: { token, user, household } }
  },
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },
  me: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
  systemStatus: async () => {
    const { data } = await apiClient.get('/auth/system-status');
    return data;
  },
  logout: async () => {
    await tokenStorage.clearAll();
  },
};
