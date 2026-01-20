'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type UserType = 'customer' | 'driver';

export default function LoginPage() {
  const { t } = useI18n();
  const [userType, setUserType] = useState<UserType>('customer');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, isLoading, error: authError, user } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push(`/${user.userType}/dashboard`);
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = t('auth.login.errorEmailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.login.errorEmailInvalid');
    }
    if (!formData.password) {
      newErrors.password = t('auth.login.errorPasswordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await login(formData.email, formData.password, userType);
      // On successful login, the user object will be updated,
      // and the useEffect above will handle the redirect.
    } catch (err) {
      // Error is already handled by the AuthContext, but you could add
      // specific UI feedback here if needed.
      console.error(err); // For debugging
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold">
            {t('auth.login.title')}
          </CardTitle>
          <CardDescription>
            {t('auth.login.subtitle')}{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              {t('public.signUp')}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.login.signInAs')}
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 border rounded-md text-sm font-medium transition-colors ${
                      userType === 'customer'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setUserType('customer')}
                    disabled={isLoading}
                  >
                    {t('auth.login.customer')}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 border rounded-md text-sm font-medium transition-colors ${
                      userType === 'driver'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setUserType('driver')}
                    disabled={isLoading}
                  >
                    {t('auth.login.driver')}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('auth.login.email')}</label>
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
              </div>

              <div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('auth.login.password')}</label>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
                </div>
                <div className="text-sm text-right mt-1">
                  <Link 
                    href="/forgot-password" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    {t('auth.login.forgot')}
                  </Link>
                </div>
              </div>
            </div>

            {authError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {authError}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                isLoading={isLoading}
              >
                {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
              </Button>
              <p className="mt-3 text-center text-xs text-gray-500">{t('auth.login.claimHint')}</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
