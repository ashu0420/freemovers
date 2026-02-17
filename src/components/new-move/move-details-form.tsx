'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/components/providers/I18nProvider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LocationInput } from '@/components/ui/LocationInput';
import { JP_LAUNCH_REGIONS, PAYMENT_OPTIONS, normalizePostalCode } from '@/lib/japan';

interface MoveDetailsFormProps {
  onNext: (data: {
    pickupAddress: string;
    pickupPostalCode?: string;
    dropoffAddress: string;
    dropoffPostalCode?: string;
    moveDate: string;
    countryCode: string;
    serviceArea: string;
    paymentPreference: string;
  }) => void;
}

export function MoveDetailsForm({ onNext }: MoveDetailsFormProps) {
  const { t } = useI18n();
  const [autofillState, setAutofillState] = useState<{ pickup: boolean; dropoff: boolean }>({
    pickup: false,
    dropoff: false,
  });
  const formSchema = z.object({
    pickupAddress: z.string().min(1, t('newMove.validation.pickup')),
    pickupPostalCode: z.string().optional(),
    dropoffAddress: z.string().min(1, t('newMove.validation.dropoff')),
    dropoffPostalCode: z.string().optional(),
    moveDate: z.string().min(1, t('newMove.validation.date')),
    countryCode: z.string().min(1),
    serviceArea: z.string().min(1, t('newMove.validation.serviceArea')),
    paymentPreference: z.string().min(1, t('newMove.validation.payment')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      pickupAddress: '',
      pickupPostalCode: '',
      dropoffAddress: '',
      dropoffPostalCode: '',
      moveDate: '',
      countryCode: 'JP',
      serviceArea: 'tokyo',
      paymentPreference: 'card',
    },
  });

  const autoFillByPostalCode = async (
    kind: 'pickup' | 'dropoff',
    postalField: 'pickupPostalCode' | 'dropoffPostalCode',
    addressField: 'pickupAddress' | 'dropoffAddress'
  ) => {
    const raw = form.getValues(postalField) || '';
    const postalCode = normalizePostalCode(raw);
    if (postalCode.length !== 7) {
      form.setError(postalField, {
        type: 'manual',
        message: t('location.invalidPostal'),
      });
      return;
    }

    try {
      setAutofillState((prev) => ({ ...prev, [kind]: true }));
      const response = await fetch(`/api/geo/jp-postal?postal_code=${postalCode}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.address) {
        form.setError(postalField, {
          type: 'manual',
          message: data?.detail || t('location.postalNotFound'),
        });
        return;
      }
      form.clearErrors(postalField);
      form.setValue(postalField, postalCode, { shouldDirty: true });
      form.setValue(addressField, data.address, { shouldDirty: true, shouldValidate: true });
    } catch {
      form.setError(postalField, {
        type: 'manual',
        message: t('location.postalLookupFailed'),
      });
    } finally {
      setAutofillState((prev) => ({ ...prev, [kind]: false }));
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    onNext(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="pickupPostalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('customer.form.pickupPostal')}</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder={t('move.homeSizeLabel')}
                      onChange={(event) => field.onChange(normalizePostalCode(event.target.value))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => autoFillByPostalCode('pickup', 'pickupPostalCode', 'pickupAddress')}
                      disabled={autofillState.pickup}
                    >
                      {autofillState.pickup ? t('common.loading') : t('location.autofill')}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dropoffPostalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('customer.form.dropoffPostal')}</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder={t('move.homeSizeLabel')}
                      onChange={(event) => field.onChange(normalizePostalCode(event.target.value))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => autoFillByPostalCode('dropoff', 'dropoffPostalCode', 'dropoffAddress')}
                      disabled={autofillState.dropoff}
                    >
                      {autofillState.dropoff ? t('common.loading') : t('location.autofill')}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
          name="pickupAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('newMove.pickup')}</FormLabel>
              <FormControl>
                <LocationInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('move.areaExample')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          <FormField
            control={form.control}
          name="dropoffAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('newMove.dropoff')}</FormLabel>
              <FormControl>
                <LocationInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('move.areaExample')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <FormField
          control={form.control}
          name="moveDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('newMove.date')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="serviceArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('customer.form.serviceArea')}</FormLabel>
                <FormControl>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {JP_LAUNCH_REGIONS.map((region) => (
                      <option key={region.value} value={region.value}>
                        {t(`region.${region.value}`)}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('customer.form.paymentPreference')}</FormLabel>
                <FormControl>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {PAYMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`payment.${option.value}`)}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit">{t('newMove.nextItems')}</Button>
        </div>
      </form>
    </Form>
  );
}
