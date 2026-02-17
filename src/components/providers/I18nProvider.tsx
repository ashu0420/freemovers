'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Locale, defaultLocale, formatMessage } from '@/lib/i18n';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored === 'en' || stored === 'ja') {
      setLocaleState(stored);
      return;
    }
    const configured = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
    if (configured === 'en' || configured === 'ja') {
      setLocaleState(configured);
      return;
    }
    const browser = navigator.language.toLowerCase();
    setLocaleState(browser.startsWith('en') ? 'en' : 'ja');
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem('locale', next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => formatMessage(locale, key, vars),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
