import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Constants ────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'pfinanc_token';
const HOUSEHOLD_KEY = 'pfinanc_household_id';

// Update this to your machine's LAN IP when testing on a physical device
// e.g. 'http://192.168.1.100:5000/api'
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

// ── Axios instance ───────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — inject JWT + household header ──────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const householdId = await SecureStore.getItemAsync(HOUSEHOLD_KEY);

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (householdId) {
    config.headers['x-household-id'] = householdId;
  }

  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  if (config.data) {
    console.log(`[API Payload]`, config.data);
  }

  return config;
});

// ── Response interceptor — normalise shape ────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => {
    console.log(`[API Response] ${res.config.method?.toUpperCase()} ${res.config.url} [Status: ${res.status}]`);
    return res;
  },
  (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message);
    if (error.response) {
      console.error(`[API Error Data]`, error.response.data);
    }
    // Surface a clean error message
    const message: string =
      error?.response?.data?.error?.message ??
      error?.response?.data?.message ??
      error?.message ??
      'Network error. Is the server running?';
    error.displayMessage = message;
    return Promise.reject(error);
  }
);

// ── Secure storage helpers ────────────────────────────────────────────────────
export const tokenStorage = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  removeToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  getHouseholdId: () => SecureStore.getItemAsync(HOUSEHOLD_KEY),
  setHouseholdId: (id: string) => SecureStore.setItemAsync(HOUSEHOLD_KEY, id),
  removeHouseholdId: () => SecureStore.deleteItemAsync(HOUSEHOLD_KEY),
  clearAll: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(HOUSEHOLD_KEY);
  },
};

export default apiClient;
