import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api, storeToken, removeToken, getStoredToken, setLogoutFn } from '@/services/api';
import type { User, SignupData } from '@/types/models';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

async function registerPushToken(authToken: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post(
      '/push/register',
      { token: expoPushToken, platform: 'expo' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch {
  }
}

async function unregisterPushToken(authToken: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post(
      '/push/unregister',
      { token: expoPushToken },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch {
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    const currentToken = await getStoredToken();
    if (currentToken) {
      await unregisterPushToken(currentToken);
    }
    await removeToken();
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    setLogoutFn(logout);
  }, [logout]);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) {
          setIsLoading(false);
          return;
        }
        const payload = decodeJwtPayload(stored);
        const now = Math.floor(Date.now() / 1000);
        if (!payload || (payload.exp !== undefined && payload.exp < now)) {
          await removeToken();
          setIsLoading(false);
          return;
        }
        const res = await api.get<User>('/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        setUser(res.data);
        setToken(stored);
        await registerPushToken(stored);
      } catch {
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    });
    const { user: userData, token: newToken } = res.data;
    await storeToken(newToken);
    setToken(newToken);
    setUser(userData);
    await registerPushToken(newToken);
  }, []);

  const signup = useCallback(
    async (data: SignupData) => {
      await api.post('/auth/register', data);
      await login(data.email, data.password);
    },
    [login]
  );

  const refreshUser = useCallback(async () => {
    try {
      const stored = await getStoredToken();
      if (!stored) return;
      const res = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${stored}` },
      });
      setUser(res.data);
    } catch {
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
