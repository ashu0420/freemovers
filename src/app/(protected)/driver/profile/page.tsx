'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useI18n } from '@/components/providers/I18nProvider';

export default function DriverProfilePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('profile.driver.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('profile.driver.subtitle')}</p>
      </div>
      <Card className="border border-slate-100 bg-white">
        <CardHeader>
          <CardTitle>{t('profile.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
