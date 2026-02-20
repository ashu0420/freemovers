'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useI18n } from '@/components/providers/I18nProvider';
import { JP_LAUNCH_REGIONS } from '@/lib/japan';
import { PhoneVerificationCard } from '@/components/shared/PhoneVerificationCard';

export function ProfileForm() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    preferred_locale: 'ja' as 'en' | 'ja',
    preferred_notification_channel: 'line' as 'line' | 'whatsapp' | 'sms',
    line_user_id: '',
    operating_regions: [] as string[],
    phone_verified: false,
    persisted_phone_number: '',
  });

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const response = await fetch(`/api/users/${user.id}`);
        const data = await response.json();
        if (response.ok) {
          setForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone_number: data.phone_number || '',
            email: data.email || '',
            preferred_locale:
              data.preferred_locale === 'en' || data.preferred_locale === 'ja'
                ? data.preferred_locale
                : 'ja',
            preferred_notification_channel:
              data.preferred_notification_channel === 'whatsapp' ||
              data.preferred_notification_channel === 'sms'
                ? data.preferred_notification_channel
                : 'line',
            line_user_id: data.line_user_id || '',
            operating_regions: Array.isArray(data.operating_regions) ? data.operating_regions : [],
            phone_verified: data.phone_verified === true,
            persisted_phone_number: data.phone_number || '',
          });
        }
      } catch {
        // no-op
      }
    };
    load();
  }, [user?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          preferred_locale: form.preferred_locale,
          preferred_notification_channel: form.preferred_notification_channel,
          line_user_id: form.line_user_id || null,
          operating_regions: form.operating_regions,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || t('profile.updateFailed'));
        return;
      }
      const phoneChanged = form.phone_number !== form.persisted_phone_number;
      setForm((prev) => ({
        ...prev,
        phone_verified: phoneChanged ? false : prev.phone_verified,
        persisted_phone_number: prev.phone_number,
      }));
      toast.success(t('profile.updated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="profile-firstName" className="text-sm font-medium text-gray-700">{t('profile.firstName')}</label>
          <Input
            id="profile-firstName"
            value={form.first_name}
            onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            placeholder={t('profile.firstNamePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-lastName" className="text-sm font-medium text-gray-700">{t('profile.lastName')}</label>
          <Input
            id="profile-lastName"
            value={form.last_name}
            onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            placeholder={t('profile.lastNamePlaceholder')}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="profile-locale" className="text-sm font-medium text-gray-700">{t('profile.locale')}</label>
          <select
            id="profile-locale"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.preferred_locale}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                preferred_locale: event.target.value === 'en' ? 'en' : 'ja',
              }))
            }
          >
            <option value="ja">JP</option>
            <option value="en">EN</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-notification" className="text-sm font-medium text-gray-700">{t('profile.notification')}</label>
          <select
            id="profile-notification"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.preferred_notification_channel}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                preferred_notification_channel:
                  event.target.value === 'line' ||
                  event.target.value === 'whatsapp' ||
                  event.target.value === 'sms'
                    ? event.target.value
                    : 'line',
              }))
            }
          >
            <option value="line">{t('profile.channel.line')}</option>
            <option value="whatsapp">{t('profile.channel.whatsapp')}</option>
            <option value="sms">{t('profile.channel.sms')}</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="profile-lineUserId" className="text-sm font-medium text-gray-700">{t('profile.lineUserId')}</label>
          <Input
            id="profile-lineUserId"
            value={form.line_user_id}
            onChange={(event) => setForm((prev) => ({ ...prev, line_user_id: event.target.value }))}
            placeholder={t('profile.lineUserIdPlaceholder')}
          />
        </div>
      </div>
      {user?.userType === 'driver' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{t('profile.operatingRegions')}</label>
          <div className="grid gap-2 rounded-md border border-orange-100 bg-orange-50/30 p-3 md:grid-cols-2">
            {JP_LAUNCH_REGIONS.map((region) => (
              <label key={region.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.operating_regions.includes(region.value)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      operating_regions: event.target.checked
                        ? [...prev.operating_regions, region.value]
                        : prev.operating_regions.filter((item) => item !== region.value),
                    }))
                  }
                />
                <span>{t(`region.${region.value}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="profile-phone" className="text-sm font-medium text-gray-700">{t('profile.phone')}</label>
          <Input
            id="profile-phone"
            value={form.phone_number}
            onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value }))}
            placeholder={t('profile.phonePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-email" className="text-sm font-medium text-gray-700">{t('profile.email')}</label>
          <Input id="profile-email" value={form.email} disabled />
        </div>
      </div>
      <PhoneVerificationCard
        phone={form.phone_number}
        initialVerified={form.phone_verified}
        persistedPhone={form.persisted_phone_number}
        onVerifiedChange={(verified) =>
          setForm((prev) => ({
            ...prev,
            phone_verified: verified,
          }))
        }
      />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isLoading} disabled={isLoading}>
          {t('profile.save')}
        </Button>
      </div>
    </form>
  );
}
