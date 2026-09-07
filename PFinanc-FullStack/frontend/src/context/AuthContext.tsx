import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface Household {
  id: string;
  name: string;
  default_currency: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

interface AuthContextType {
  user: User | null;
  households: Household[];
  currentHousehold: Household | null;
  viewMode: 'household' | 'personal';
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, householdName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchHousehold: (householdId: string) => void;
  setViewMode: (mode: 'household' | 'personal') => void;
  switchDemoUser: (email: string) => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [viewMode, setViewMode] = useState<'household' | 'personal'>('household');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('pfinanc_token') : null;
    if (!token || token === 'undefined') {
      if (typeof window !== 'undefined') localStorage.removeItem('pfinanc_token');
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data.user);
        setHouseholds(res.data.households || []);
        
        const savedHouseholdId = typeof window !== 'undefined' ? localStorage.getItem('pfinanc_household_id') : null;
        const match = res.data.households.find((h: Household) => h.id === savedHouseholdId);
        if (match) {
          setCurrentHousehold(match);
        } else if (res.data.households.length > 0) {
          setCurrentHousehold(res.data.households[0]);
          if (typeof window !== 'undefined') {
            localStorage.setItem('pfinanc_household_id', res.data.households[0].id);
          }
        }
      } else {
        // If it's just a network error (e.g. backend down), don't force logout
        if (res.error?.code === 'NETWORK_ERROR') {
          console.warn('Backend unreachable, keeping session intact.');
        } else {
          console.error('Auth check failed:', res.error);
          logout();
        }
      }
    } catch (err) {
      console.error('Failed to init auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res.success && res.data) {
        if (typeof window !== 'undefined' && res.data.token) {
          localStorage.setItem('pfinanc_token', res.data.token);
        }
        setUser(res.data.user);
        setHouseholds(res.data.households || []);
        
        const defaultHousehold = res.data.households?.find((h: Household) => h.id === res.data.defaultHouseholdId) || res.data.households?.[0] || null;
        if (defaultHousehold) {
          setCurrentHousehold(defaultHousehold);
          if (typeof window !== 'undefined') {
            localStorage.setItem('pfinanc_household_id', defaultHousehold.id);
          }
        }
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: res.error?.message || 'Invalid email or password' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    householdName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await api.register(email.trim(), password, name.trim(), householdName?.trim() || undefined);
      if (res.success && res.data) {
        if (typeof window !== 'undefined' && res.data.token) {
          localStorage.setItem('pfinanc_token', res.data.token);
          if (res.data.defaultHouseholdId) {
            localStorage.setItem('pfinanc_household_id', res.data.defaultHouseholdId);
          }
        }
        setUser(res.data.user);
        await initAuth(); // Sync the state immediately
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: res.error?.message || 'Registration failed' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pfinanc_token');
      localStorage.removeItem('pfinanc_household_id');
    }
    setUser(null);
    setHouseholds([]);
    setCurrentHousehold(null);
  };

  const switchHousehold = (householdId: string) => {
    const found = households.find((h) => h.id === householdId);
    if (found) {
      setCurrentHousehold(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pfinanc_household_id', found.id);
      }
    }
  };

  const switchDemoUser = async (email: string) => {
    await login(email, 'Password@123');
  };

  const reloadUser = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        households,
        currentHousehold,
        viewMode,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchHousehold,
        setViewMode,
        switchDemoUser,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
