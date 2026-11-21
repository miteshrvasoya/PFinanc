import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  householdId: string | null;
  isLoading: boolean;
  login: (token: string, user: User, householdId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  householdId: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');
        const storedHousehold = await AsyncStorage.getItem('household_id');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setHouseholdId(storedHousehold);
        }
      } catch (error) {
        console.error('Failed to load auth data', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAuthData();
  }, []);

  const login = async (newToken: string, userData: User, newHouseholdId?: string) => {
    try {
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
      if (newHouseholdId) {
        await AsyncStorage.setItem('household_id', newHouseholdId);
      }
      setToken(newToken);
      setUser(userData);
      setHouseholdId(newHouseholdId || null);
    } catch (error) {
      console.error('Failed to save auth data', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      await AsyncStorage.removeItem('household_id');
      setToken(null);
      setUser(null);
      setHouseholdId(null);
    } catch (error) {
      console.error('Failed to clear auth data', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, householdId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
