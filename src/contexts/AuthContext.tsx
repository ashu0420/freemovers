'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { loginUser, registerUser, logoutUser } from '@/lib/api';

type UserType = 'customer' | 'driver' | null;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  phoneVerified?: boolean;
  preferredLocale?: 'en' | 'ja';
  preferredNotificationChannel?: 'line' | 'whatsapp' | 'sms';
  lineUserId?: string | null;
  accessToken?: string;
  refreshToken?: string;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        
        if (userData && accessToken) {
          // In a real app, you might want to validate the token with the backend
          setUser(JSON.parse(userData));
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // Clear invalid auth data
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, userType: UserType) => {
    if (!email || !password || !userType) {
      throw new Error('Please provide all required fields');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await loginUser({
        email,
        password,
        user_type: userType as 'customer' | 'driver'
      });
      
      if (response.error || !response.data) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : 'Login failed. Please check your credentials.'
        );
      }
      
      const { access, refresh, user } = response.data;
      const userData: User = {
        id: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        phoneVerified: user.phone_verified,
        preferredLocale: user.preferred_locale,
        preferredNotificationChannel: user.preferred_notification_channel,
        lineUserId: user.line_user_id,
        accessToken: access,
        refreshToken: refresh
      };

      if (user.preferred_locale === 'en' || user.preferred_locale === 'ja') {
        localStorage.setItem('locale', user.preferred_locale);
      }
      
      // Store auth data
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      setUser(userData);

      // Claim guest-created moves for this phone number after successful login.
      fetch('/api/auth/claim-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(user.id) }),
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
  };

  const register = async (userData: {
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
        password2: password, // Assuming the API requires password confirmation
        first_name: firstName,
        last_name: lastName,
        user_type: userType as 'customer' | 'driver',
        phone_number: phoneNumber,
        preferred_locale:
          localStorage.getItem('locale') === 'en' || localStorage.getItem('locale') === 'ja'
            ? (localStorage.getItem('locale') as 'en' | 'ja')
            : 'ja',
      });
      
      if (response.error || !response.data) {
        throw new Error(
          typeof response.error === 'string' 
            ? response.error 
            : 'Registration failed. Please check your information.'
        );
      }
      
      // Automatically log in the user after successful registration
      await login(email, password, userType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Call the logout API if we have a refresh token
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch (err) {
      console.error('Error during logout:', err);
      // Continue with client-side cleanup even if API call fails
    } finally {
      // Clear all auth data
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
      }}
    >
      {!isLoading && children}
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
