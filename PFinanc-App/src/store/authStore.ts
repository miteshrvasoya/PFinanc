import { create } from 'zustand';
import { authApi } from '../api/auth';
import { tokenStorage } from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Household {
  id: string;
  name: string;
}

interface AuthState {
  user: User | null;
  household: Household | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, householdName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  setHousehold: (household: Household) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  household: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    if (!res.success) throw new Error(res.error?.message ?? 'Login failed');
    const { token, user, household } = res.data;
    await tokenStorage.setToken(token);
    if (household?.id) await tokenStorage.setHouseholdId(household.id);
    set({ user, household, token, isAuthenticated: true });
  },

  register: async (name, email, password, householdName) => {
    const res = await authApi.register({ name, email, password, household_name: householdName });
    if (!res.success) throw new Error(res.error?.message ?? 'Registration failed');
    const { token, user, household } = res.data;
    await tokenStorage.setToken(token);
    if (household?.id) await tokenStorage.setHouseholdId(household.id);
    set({ user, household, token, isAuthenticated: true });
  },

  logout: async () => {
    await tokenStorage.clearAll();
    set({ user: null, household: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      // Validate token with server
      const res = await authApi.me();
      if (res.success && res.data) {
        let householdId = await tokenStorage.getHouseholdId();
        const activeHousehold = res.data.household ?? (householdId ? { id: householdId, name: '' } : null);
        
        // Auto-fix missing householdId in secure store if backend returned one
        if (res.data.household?.id && res.data.household.id !== householdId) {
          await tokenStorage.setHouseholdId(res.data.household.id);
          householdId = res.data.household.id;
        }

        set({
          user: res.data.user ?? res.data,
          household: activeHousehold,
          token,
          isAuthenticated: true,
        });
      } else {
        await tokenStorage.clearAll();
        set({ isAuthenticated: false });
      }
    } catch {
      await tokenStorage.clearAll();
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  setHousehold: async (household) => {
    if (household?.id) {
      await tokenStorage.setHouseholdId(household.id);
    }
    set({ household });
  },
}));
