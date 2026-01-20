'use client';

import { useI18n } from '@/components/providers/I18nProvider';

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">{t('legal.privacyTitle')}</h1>
      <p className="mt-3 text-sm text-gray-600">{t('legal.privacyIntro')}</p>
      <div className="mt-8 space-y-5 text-sm text-gray-700">
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.data')}</h2>
          <p>{t('legal.privacy.data')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.use')}</h2>
          <p>{t('legal.privacy.use')}</p>
        </section>
        <section>
          <h2 className="font-semibold text-gray-900">{t('legal.section.thirdParty')}</h2>
          <p>{t('legal.privacy.thirdParty')}</p>
        </section>
      </div>
    </div>
  );
}
