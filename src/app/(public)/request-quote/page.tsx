'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/LocationInput';
import { useI18n } from '@/components/providers/I18nProvider';
import { JP_LAUNCH_REGIONS, PAYMENT_OPTIONS, normalizePostalCode } from '@/lib/japan';
import Link from 'next/link';

type MoveItem = { name: string; quantity: number };

export default function GuestRequestQuotePage() {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    pickupPostalCode: '',
    pickupAddress: '',
    dropoffPostalCode: '',
    dropoffAddress: '',
    moveDate: '',
    serviceArea: 'tokyo',
    paymentPreference: 'card',
  });
  const [items, setItems] = useState<MoveItem[]>([{ name: '', quantity: 1 }]);

  const handleItemChange = (index: number, key: 'name' | 'quantity', value: string) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, [key]: key === 'quantity' ? Number(value) || 1 : value }
          : item
      )
    );
  };

  const autoFillAddressFromPostal = async (kind: 'pickup' | 'dropoff') => {
    const postalCode = normalizePostalCode(
      kind === 'pickup' ? form.pickupPostalCode : form.dropoffPostalCode
    );
    if (postalCode.length !== 7) {
      toast.error(t('location.invalidPostal'));
      return;
    }
    try {
      const response = await fetch(`/api/geo/jp-postal?postal_code=${postalCode}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.address) {
        toast.error(data?.detail || t('location.postalNotFound'));
        return;
      }
      setForm((prev) =>
        kind === 'pickup'
          ? { ...prev, pickupPostalCode: postalCode, pickupAddress: data.address }
          : { ...prev, dropoffPostalCode: postalCode, dropoffAddress: data.address }
      );
    } catch {
      toast.error(t('location.postalLookupFailed'));
    }
  };

  const submitGuestRequest = async (event: React.FormEvent) => {
    event.preventDefault();

    const validItems = items.filter((item) => item.name.trim().length > 0 && item.quantity > 0);
    if (
      !form.phone ||
      !form.pickupAddress ||
      !form.dropoffAddress ||
      !form.moveDate ||
      !form.serviceArea ||
      !form.paymentPreference ||
      validItems.length === 0
    ) {
      toast.error(t('customer.form.missing'));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/guest/moves/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.firstName || undefined,
          last_name: form.lastName || undefined,
          phone_number: form.phone,
          pickup_address: form.pickupAddress,
          pickup_postal_code: form.pickupPostalCode || null,
          dropoff_address: form.dropoffAddress,
          dropoff_postal_code: form.dropoffPostalCode || null,
          move_date: form.moveDate,
          country_code: 'JP',
          service_area: form.serviceArea,
          payment_preference: form.paymentPreference,
          items: validItems,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(data?.detail || t('guest.requestFailed'));
        return;
      }
      toast.success(t('guest.requestSuccess'));
      setForm({
        firstName: '',
        lastName: '',
        phone: '',
        pickupPostalCode: '',
        pickupAddress: '',
        dropoffPostalCode: '',
        dropoffAddress: '',
        moveDate: '',
        serviceArea: 'tokyo',
        paymentPreference: 'card',
      });
      setItems([{ name: '', quantity: 1 }]);
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">{t('guest.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t('guest.subtitle')}</p>
      </div>

      <form className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6" onSubmit={submitGuestRequest}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('profile.firstName')}</label>
            <Input
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              placeholder={t('profile.firstNamePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('profile.lastName')}</label>
            <Input
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              placeholder={t('profile.lastNamePlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{t('profile.phone')}</label>
          <Input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder={t('profile.phonePlaceholder')}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.pickupPostal')}</label>
            <div className="flex gap-2">
              <Input
                value={form.pickupPostalCode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pickupPostalCode: normalizePostalCode(event.target.value),
                  }))
                }
                placeholder="1000001"
              />
              <Button type="button" variant="outline" onClick={() => autoFillAddressFromPostal('pickup')}>
                {t('location.autofill')}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.dropoffPostal')}</label>
            <div className="flex gap-2">
              <Input
                value={form.dropoffPostalCode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dropoffPostalCode: normalizePostalCode(event.target.value),
                  }))
                }
                placeholder="1000001"
              />
              <Button type="button" variant="outline" onClick={() => autoFillAddressFromPostal('dropoff')}>
                {t('location.autofill')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.pickup')}</label>
            <LocationInput
              value={form.pickupAddress}
              onChange={(value) => setForm((prev) => ({ ...prev, pickupAddress: value }))}
              placeholder={t('customer.form.pickup')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.dropoff')}</label>
            <LocationInput
              value={form.dropoffAddress}
              onChange={(value) => setForm((prev) => ({ ...prev, dropoffAddress: value }))}
              placeholder={t('customer.form.dropoff')}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.date')}</label>
            <Input
              type="date"
              value={form.moveDate}
              onChange={(event) => setForm((prev) => ({ ...prev, moveDate: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.serviceArea')}</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.serviceArea}
              onChange={(event) => setForm((prev) => ({ ...prev, serviceArea: event.target.value }))}
            >
              {JP_LAUNCH_REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {t(`region.${region.value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('customer.form.paymentPreference')}</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.paymentPreference}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, paymentPreference: event.target.value }))
              }
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(`payment.${option.value}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{t('customer.form.items')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { name: '', quantity: 1 }])}>
              {t('customer.form.addItem')}
            </Button>
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-6 items-end">
              <div className="md:col-span-4 space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('customer.form.itemName')}</label>
                <Input
                  value={item.name}
                  onChange={(event) => handleItemChange(index, 'name', event.target.value)}
                  placeholder={t('customer.form.itemName')}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('customer.form.quantity')}</label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
            {t('guest.submit')}
          </Button>
          <p className="text-center text-xs text-gray-600">
            {t('guest.loginHint')}{' '}
            <Link className="font-medium text-orange-600 hover:text-orange-700" href="/login">
              {t('public.signIn')}
            </Link>
            {' / '}
            <Link className="font-medium text-orange-600 hover:text-orange-700" href="/signup">
              {t('public.signUp')}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
