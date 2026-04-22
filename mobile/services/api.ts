import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let _logoutFn: (() => void) | null = null;

export function setLogoutFn(fn: () => void) {
  _logoutFn = fn;
}

api.interceptors.request.use(
  async (config) => {
    try {
      const token = Platform.OS === 'web'
        ? localStorage.getItem('smart_deals_token')
        : await SecureStore.getItemAsync('smart_deals_token');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      _logoutFn?.();
    }
    return Promise.reject(error);
  }
);

export async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('smart_deals_token', token);
  } else {
    await SecureStore.setItemAsync('smart_deals_token', token);
  }
}

export async function removeToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem('smart_deals_token');
  } else {
    await SecureStore.deleteItemAsync('smart_deals_token');
  }
}

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('smart_deals_token');
  }
  return SecureStore.getItemAsync('smart_deals_token');
}
