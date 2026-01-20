'use client';

import { SignUpForm } from '@/components/auth/SignUpForm';
import { useI18n } from '@/components/providers/I18nProvider';

export default function SignUpPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t('auth.signup.title')}</h1>
        <SignUpForm />
      </div>
    </div>
  );
}
