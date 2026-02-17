'use client';

import Link from 'next/link';
import { Coins, Gift, Sparkles } from 'lucide-react';
import { useI18n } from '@/components/providers/I18nProvider';

type MoversCoinTeaserProps = {
  /** Show the "sign up for early access" call-to-action (public pages). */
  showCta?: boolean;
  /** Show a mock balance chip (authenticated dashboards). */
  showBalance?: boolean;
  className?: string;
};

/**
 * Marketing teaser for the upcoming MoversCoin loyalty program.
 * Purely presentational "coming soon" preview. No backend yet.
 */
export function MoversCoinTeaser({
  showCta = false,
  showBalance = false,
  className = '',
}: MoversCoinTeaserProps) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t('coin.brand')}
      className={`relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-6 shadow-sm sm:p-8 ${className}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-6 h-40 w-40 rounded-full bg-orange-200/50 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-200/70">
              <Coins className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold text-gray-900">{t('coin.brand')}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  <Sparkles className="h-3 w-3" />
                  {t('coin.badge')}
                </span>
              </div>
              <p className="text-sm text-gray-600">{t('coin.title')}</p>
            </div>
          </div>

          <p className="text-sm leading-6 text-gray-700 sm:text-base">{t('coin.subtitle')}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-white/70 p-3">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <Coins className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('coin.earnTitle')}</p>
                <p className="text-xs leading-5 text-gray-600">{t('coin.earnDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-white/70 p-3">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <Gift className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('coin.redeemTitle')}</p>
                <p className="text-xs leading-5 text-gray-600">{t('coin.redeemDesc')}</p>
              </div>
            </div>
          </div>

          {showCta && (
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700"
            >
              {t('coin.signupCta')}
            </Link>
          )}
        </div>

        {showBalance && (
          <div className="shrink-0">
            <div className="rounded-2xl border border-amber-200 bg-white/80 px-6 py-5 text-center shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">
                {t('coin.balanceLabel')}
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                0 <span className="text-base font-semibold text-amber-600">MVC</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500">{t('coin.comingSoon')}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
