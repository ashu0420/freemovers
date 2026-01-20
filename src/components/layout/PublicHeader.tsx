'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/providers/I18nProvider';

export function PublicHeader() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              FreeMovers
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/legal/terms" className="hidden text-xs text-gray-500 hover:text-gray-700 sm:block">
              {t('legal.terms')}
            </Link>
            <Link href="/legal/privacy" className="hidden text-xs text-gray-500 hover:text-gray-700 sm:block">
              {t('legal.privacy')}
            </Link>
            <Link href="/legal/commerce" className="hidden text-xs text-gray-500 hover:text-gray-700 sm:block">
              {t('legal.commerce')}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('app.language')}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as 'en' | 'ja')}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
              >
                <option value="en">EN</option>
                <option value="ja">JP</option>
              </select>
            </div>
            {!user && (
              <>
                <Button asChild variant="ghost">
                  <Link href="/request-quote">{t('guest.quickCta')}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/login">{t('public.signIn')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">{t('public.signUp')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
