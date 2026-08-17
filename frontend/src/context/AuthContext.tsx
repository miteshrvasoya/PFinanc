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
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  switchHousehold: (householdId: string) => void;
  setViewMode: (mode: 'household' | 'personal') => void;
  switchDemoUser: (email: string) => Promise<void>;
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
    const token = localStorage.getItem('pfinanc_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data.user);
        setHouseholds(res.data.households || []);
        
        const savedHouseholdId = localStorage.getItem('pfinanc_household_id');
        const match = res.data.households.find((h: Household) => h.id === savedHouseholdId);
        if (match) {
          setCurrentHousehold(match);
        } else if (res.data.households.length > 0) {
          setCurrentHousehold(res.data.households[0]);
          localStorage.setItem('pfinanc_household_id', res.data.households[0].id);
        }
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const res = await api.login(email, password);
    setIsLoading(false);

    if (res.success && res.data) {
      localStorage.setItem('pfinanc_token', res.data.token);
      setUser(res.data.user);
      setHouseholds(res.data.households || []);
      
      const defaultHousehold = res.data.households?.find((h: Household) => h.id === res.data.defaultHouseholdId) || res.data.households?.[0] || null;
      if (defaultHousehold) {
        setCurrentHousehold(defaultHousehold);
        localStorage.setItem('pfinanc_household_id', defaultHousehold.id);
      }
      return true;
    }
    return false;
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    const res = await api.register(email, password, name);
    setIsLoading(false);

    if (res.success && res.data) {
      localStorage.setItem('pfinanc_token', res.data.token);
      setUser(res.data.user);
      if (res.data.defaultHouseholdId) {
        localStorage.setItem('pfinanc_household_id', res.data.defaultHouseholdId);
      }
      await initAuth();
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('pfinanc_token');
    localStorage.removeItem('pfinanc_household_id');
    setUser(null);
    setHouseholds([]);
    setCurrentHousehold(null);
  };

  const switchHousehold = (householdId: string) => {
    const found = households.find((h) => h.id === householdId);
    if (found) {
      setCurrentHousehold(found);
      localStorage.setItem('pfinanc_household_id', found.id);
    }
  };

  const switchDemoUser = async (email: string) => {
    await login(email, 'Password@123');
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
