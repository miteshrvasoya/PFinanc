import AsyncStorage from '@react-native-async-storage/async-storage';

import { NativeModules, Platform } from 'react-native';

const ENV_URL = process.env.EXPO_PUBLIC_API_URL;
const OVERRIDE_KEY = 'api_base_url_override';
const BACKEND_PORT = 5000;
const REQUEST_TIMEOUT_MS = 20000;

const normalize = (url: string) => {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
};

const isLocalUrl = (url?: string) =>
  !url || /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url);

/**
 * In development the phone loaded the JS bundle from the machine running Metro, which is normally the same
 * machine as the backend. Using that host means a changed Wi-Fi IP never leaves the app pointing at a stale
 * address saved in .env.
 */
const devServerHost = (): string | null => {
  if (!__DEV__) return null;
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    const host = scriptURL?.match(/^https?:\/\/([^/:]+)/i)?.[1];
    if (!host) return null;
    if ((host === 'localhost' || host === '127.0.0.1') && Platform.OS === 'android') return '10.0.2.2';
    return host;
  } catch {
    return null;
  }
};

let cachedBase: string | null = null;

/** Resolution order: address saved in the app > dev machine (when .env is a LAN/empty address) > .env */
export const getApiBaseUrl = async (): Promise<string> => {
  if (cachedBase) return cachedBase;
  try {
    const saved = await AsyncStorage.getItem(OVERRIDE_KEY);
    if (saved) return (cachedBase = normalize(saved));
  } catch {}
  if (isLocalUrl(ENV_URL)) {
    const host = devServerHost();
    if (host) return (cachedBase = `http://${host}:${BACKEND_PORT}`);
  }
  return (cachedBase = normalize(ENV_URL || ''));
};

export const setApiBaseUrlOverride = async (url: string | null) => {
  cachedBase = null;
  if (url && url.trim()) await AsyncStorage.setItem(OVERRIDE_KEY, normalize(url));
  else await AsyncStorage.removeItem(OVERRIDE_KEY);
};

/** Ping the backend's /health endpoint. Returns null when reachable, otherwise a readable reason. */
export const testServer = async (url: string): Promise<string | null> => {
  const base = normalize(url);
  if (!base) return 'Enter a server address.';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${base}/health`, { signal: ctrl.signal });
    return res.ok ? null : `The server answered with an error (HTTP ${res.status}).`;
  } catch {
    return `Can't reach ${base}. Check the backend is running and your phone is on the same Wi-Fi.`;
  } finally {
    clearTimeout(timer);
  }
};

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
  const base = await getApiBaseUrl();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${base}${endpoint}`, {
        method,
        headers: await getHeaders(headers),
        signal: ctrl.signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (netErr: any) {
      // fetch only rejects when no response arrived at all (server down, wrong address, firewall, timeout)
      throw new Error(
        ctrl.signal.aborted
          ? `The server at ${base} took too long to respond.`
          : `Can't reach the PFinanc server at ${base}. Make sure the backend is running and your phone is on the same Wi-Fi.`
      );
    }
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
  } finally {
    clearTimeout(timer);
  }
};

export const apiClient = {
  get: (endpoint: string, headers: any = {}) => request('GET', endpoint, undefined, headers),
  post: (endpoint: string, body: any, headers: any = {}) => request('POST', endpoint, body, headers),
  put: (endpoint: string, body: any, headers: any = {}) => request('PUT', endpoint, body, headers),
  patch: (endpoint: string, body: any, headers: any = {}) => request('PATCH', endpoint, body, headers),
  delete: (endpoint: string, headers: any = {}) => request('DELETE', endpoint, undefined, headers),
};
