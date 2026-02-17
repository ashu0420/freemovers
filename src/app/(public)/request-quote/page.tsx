'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/LocationInput';
import { useI18n } from '@/components/providers/I18nProvider';
import { JP_LAUNCH_REGIONS, PAYMENT_OPTIONS, normalizePostalCode } from '@/lib/japan';
import Link from 'next/link';

type MoveItem = { name: string; quantity: number };

type FieldErrors = Record<string, string>;

export default function GuestRequestQuotePage() {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  const setFieldRef = (name: string) => (el: HTMLInputElement | HTMLSelectElement | null) => {
    fieldRefs.current[name] = el;
  };

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

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!form.firstName.trim()) next['firstName'] = t('quote.requiredFirstName');
    if (!form.lastName.trim()) next['lastName'] = t('quote.requiredLastName');
    if (!form.phone.trim()) {
      next['phone'] = t('quote.requiredPhone');
    } else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone.trim())) {
      next['phone'] = t('quote.invalidPhone');
    }
    if (!form.pickupAddress.trim()) next['pickupAddress'] = t('quote.requiredPickup');
    if (!form.dropoffAddress.trim()) next['dropoffAddress'] = t('quote.requiredDropoff');
    if (!form.moveDate.trim()) next['moveDate'] = t('quote.requiredDate');
    const validItems = items.filter(
      (item) => item.name.trim().length > 0 && item.quantity > 0
    );
    if (validItems.length === 0) next['items'] = t('quote.requiredItem');
    return next;
  };

  const submitGuestRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstInvalid = Object.keys(validationErrors)[0];
      fieldRefs.current[firstInvalid]?.focus();
      toast.error(t('quote.invalidField'));
      return;
    }

    const validItems = items.filter(
      (item) => item.name.trim().length > 0 && item.quantity > 0
    );

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
        setApiError(data?.detail || t('guest.requestFailed'));
        toast.error(data?.detail || t('guest.requestFailed'));
        return;
      }
      setSubmitted(true);
      toast.success(t('guest.requestSuccess'));
    } catch {
      setApiError(t('common.networkError'));
      toast.error(t('common.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const FieldError = ({ name }: { name: string }) =>
    errors[name] ? (
      <p id={`guest-error-${name}`} className="text-sm font-medium text-red-600">
        {errors[name]}
      </p>
    ) : null;

  if (submitted) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-green-100 bg-green-50/60 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-2xl text-white">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('quote.successTitle')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
            {t('quote.successBody')}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs text-gray-500">{t('quote.estimatedNote')}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/signup">{t('quote.createAccount')}</Link>
            </Button>
            <p className="text-center text-xs text-gray-600">
              {t('guest.loginHint')}{' '}
              <Link className="font-medium text-orange-600 hover:text-orange-700" href="/login">
                {t('public.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ariaProps = (name: string) => ({
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `guest-error-${name}` : undefined,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">{t('guest.title')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t('guest.subtitle')}</p>
      </div>

      {apiError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {apiError}
        </div>
      )}

      <form className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6" onSubmit={submitGuestRequest} noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="guest-firstName" className="text-sm font-medium text-gray-700">{t('profile.firstName')}</label>
            <Input
              id="guest-firstName"
              ref={setFieldRef('firstName')}
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              placeholder={t('profile.firstNamePlaceholder')}
              {...ariaProps('firstName')}
            />
            <FieldError name="firstName" />
          </div>
          <div className="space-y-2">
            <label htmlFor="guest-lastName" className="text-sm font-medium text-gray-700">{t('profile.lastName')}</label>
            <Input
              id="guest-lastName"
              ref={setFieldRef('lastName')}
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              placeholder={t('profile.lastNamePlaceholder')}
              {...ariaProps('lastName')}
            />
            <FieldError name="lastName" />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="guest-phone" className="text-sm font-medium text-gray-700">{t('profile.phone')}</label>
          <Input
            id="guest-phone"
            ref={setFieldRef('phone')}
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder={t('profile.phonePlaceholder')}
            {...ariaProps('phone')}
          />
          <FieldError name="phone" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="guest-pickupPostal" className="text-sm font-medium text-gray-700">{t('customer.form.pickupPostal')}</label>
            <div className="flex gap-2">
              <Input
                id="guest-pickupPostal"
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
            <label htmlFor="guest-dropoffPostal" className="text-sm font-medium text-gray-700">{t('customer.form.dropoffPostal')}</label>
            <div className="flex gap-2">
              <Input
                id="guest-dropoffPostal"
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
            <label htmlFor="guest-pickup" className="text-sm font-medium text-gray-700">{t('customer.form.pickup')}</label>
            <LocationInput
              id="guest-pickup"
              value={form.pickupAddress}
              onChange={(value) => setForm((prev) => ({ ...prev, pickupAddress: value }))}
              placeholder={t('customer.form.pickup')}
            />
            <FieldError name="pickupAddress" />
          </div>
          <div className="space-y-2">
            <label htmlFor="guest-dropoff" className="text-sm font-medium text-gray-700">{t('customer.form.dropoff')}</label>
            <LocationInput
              id="guest-dropoff"
              value={form.dropoffAddress}
              onChange={(value) => setForm((prev) => ({ ...prev, dropoffAddress: value }))}
              placeholder={t('customer.form.dropoff')}
            />
            <FieldError name="dropoffAddress" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="guest-moveDate" className="text-sm font-medium text-gray-700">{t('customer.form.date')}</label>
            <Input
              id="guest-moveDate"
              ref={setFieldRef('moveDate')}
              type="date"
              value={form.moveDate}
              onChange={(event) => setForm((prev) => ({ ...prev, moveDate: event.target.value }))}
              {...ariaProps('moveDate')}
            />
            <FieldError name="moveDate" />
          </div>
          <div className="space-y-2">
            <label htmlFor="guest-serviceArea" className="text-sm font-medium text-gray-700">{t('customer.form.serviceArea')}</label>
            <select
              id="guest-serviceArea"
              ref={setFieldRef('serviceArea')}
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
            <label htmlFor="guest-paymentPreference" className="text-sm font-medium text-gray-700">{t('customer.form.paymentPreference')}</label>
            <select
              id="guest-paymentPreference"
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
          <p className="text-xs text-gray-500">{t('move.addItemHint')}</p>
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-6 items-end">
              <div className="md:col-span-4 space-y-2">
                <label htmlFor={`guest-itemName-${index}`} className="text-sm font-medium text-gray-700">{t('customer.form.itemName')}</label>
                <Input
                  id={`guest-itemName-${index}`}
                  ref={index === 0 ? setFieldRef('items') : undefined}
                  value={item.name}
                  onChange={(event) => handleItemChange(index, 'name', event.target.value)}
                  placeholder={t('customer.form.itemName')}
                  {...(index === 0 ? ariaProps('items') : {})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label htmlFor={`guest-itemQty-${index}`} className="text-sm font-medium text-gray-700">{t('customer.form.quantity')}</label>
                <Input
                  id={`guest-itemQty-${index}`}
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                />
              </div>
            </div>
          ))}
          <FieldError name="items" />
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
