'use client';

import { useI18n } from '@/components/providers/I18nProvider';

export default function CommercePage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">{t('legal.commerceTitle')}</h1>
      <p className="mt-3 text-sm text-gray-600">{t('legal.commerceIntro')}</p>
      <div className="mt-8 space-y-5 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.operator')}</h2>
          <p>{t('legal.commerce.operator')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.fees')}</h2>
          <p>{t('legal.commerce.fees')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.contact')}</h2>
          <p>{t('legal.commerce.contact')}</p>
        </section>
      </div>
    </div>
  );
}
