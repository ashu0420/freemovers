'use client';

import { useI18n } from '@/components/providers/I18nProvider';

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">{t('legal.termsTitle')}</h1>
      <p className="mt-3 text-sm text-gray-600">{t('legal.termsIntro')}</p>
      <div className="mt-8 space-y-5 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.scope')}</h2>
          <p>{t('legal.terms.scope')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.booking')}</h2>
          <p>{t('legal.terms.booking')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.cancellation')}</h2>
          <p>{t('legal.terms.cancellation')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.support')}</h2>
          <p>{t('legal.terms.support')}</p>
        </section>
      </div>
    </div>
  );
}
