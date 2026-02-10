'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { loginUser, registerUser, logoutUser } from '@/lib/api';

type UserType = 'customer' | 'driver' | 'admin' | null;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  role?: string;
  phoneVerified?: boolean;
  preferredLocale?: 'en' | 'ja';
  preferredNotificationChannel?: 'line' | 'whatsapp' | 'sms';
  lineUserId?: string | null;
}

interface MeResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'driver' | 'admin';
  role?: string;
  phone_verified?: boolean;
  preferred_locale?: 'en' | 'ja';
  preferred_notification_channel?: 'line' | 'whatsapp' | 'sms';
  line_user_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, userType: UserType) => Promise<void>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    userType: UserType;
    phoneNumber: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function meToUser(me: MeResponse): User {
  return {
    id: me.id.toString(),
    email: me.email,
    firstName: me.first_name,
    lastName: me.last_name,
    userType: me.user_type,
    role: me.role,
    phoneVerified: me.phone_verified,
    preferredLocale: me.preferred_locale,
    preferredNotificationChannel: me.preferred_notification_channel,
    lineUserId: me.line_user_id,
  };
}

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as MeResponse;
    return meToUser(data);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on initial load by calling the session endpoint.
  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      const current = await fetchCurrentUser();
      if (active) {
        setUser(current);
        setIsLoading(false);
      }
    };
    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, userType: UserType) => {
    if (!email || !password || !userType) {
      throw new Error('Please provide all required fields');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginUser({
        email,
        password,
        user_type: userType as 'customer' | 'driver' | 'admin',
      });

      if (response.error || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : 'Login failed. Please check your credentials.'
        );
      }

      if (response.data.user?.preferred_locale === 'en' || response.data.user?.preferred_locale === 'ja') {
        // best-effort locale preference (no server storage needed)
      }

      // Re-fetch the current user from the session cookie.
      const current = await fetchCurrentUser();
      setUser(current);

      // Claim guest-created moves for this phone number after successful login.
      fetch('/api/auth/claim-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(response.data.user?.id) }),
      }).catch(() => {
        // Non-blocking background reconciliation.
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    userType: UserType;
    phoneNumber: string;
  }) => {
    const { firstName, lastName, email, password, userType, phoneNumber } = userData;

    if (!email || !password || !userType || !firstName || !lastName || !phoneNumber) {
      throw new Error('Please fill in all required fields');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await registerUser({
        email,
        password,
        password2: password,
        first_name: firstName,
        last_name: lastName,
        user_type: userType as 'customer' | 'driver',
        phone_number: phoneNumber,
        preferred_locale: 'ja',
      });

      if (response.error || !response.data) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : 'Registration failed. Please check your information.'
        );
      }

      // Automatically log in the user after successful registration by
      // re-fetching the session identity.
      const current = await fetchCurrentUser();
      setUser(current);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser(''); // server clears the cookie regardless of body
    } catch (err) {
      console.error('Error during logout:', err);
      // Continue with client-side cleanup even if API call fails.
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoading,
        error,
        isAdmin: user?.userType === 'admin' || user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
