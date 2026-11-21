import AsyncStorage from '@react-native-async-storage/async-storage';

// const LOCALHOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const getHeaders = async (customHeaders: any = {}) => {
  const token = await AsyncStorage.getItem('auth_token');
  const householdId = await AsyncStorage.getItem('household_id');

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(householdId ? { 'x-household-id': householdId } : {}),
    ...customHeaders,
  };
};

/**
 * Sends a request and parses the JSON body. A non-JSON body (e.g. a hosting
 * platform's plain-text "A server error has occurred" page) becomes a readable
 * error instead of a JSON parse exception.
 */
const request = async (method: string, endpoint: string, body?: any, headers: any = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: await getHeaders(headers),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          response.ok
            ? `Unexpected response from server (${response.status}) for ${endpoint}`
            : `Server is unavailable right now (HTTP ${response.status}). Please try again later.`
        );
      }
    }
    if (!response.ok) {
      throw new Error(data?.message || data?.error?.message || `Request failed (HTTP ${response.status})`);
    }
    return data;
  } catch (error) {
    console.error(`${method} ${endpoint} failed:`, error);
    throw error;
  }
};

export const apiClient = {
  get: (endpoint: string, headers: any = {}) => request('GET', endpoint, undefined, headers),
  post: (endpoint: string, body: any, headers: any = {}) => request('POST', endpoint, body, headers),
  put: (endpoint: string, body: any, headers: any = {}) => request('PUT', endpoint, body, headers),
  delete: (endpoint: string, headers: any = {}) => request('DELETE', endpoint, undefined, headers),
};
