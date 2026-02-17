'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoveDetailsForm } from '@/components/new-move/move-details-form';
import { AddItemsForm } from '@/components/new-move/add-items-form';
import { ConfirmationStep } from '@/components/new-move/confirmation-step';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/providers/I18nProvider';

export default function NewMovePage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { t } = useI18n();

  const steps = useMemo(
    () => [
      {
        id: 1,
        title: t('newMove.step1.title'),
        description: t('newMove.step1.desc'),
      },
      {
        id: 2,
        title: t('newMove.step2.title'),
        description: t('newMove.step2.desc'),
      },
      {
        id: 3,
        title: t('newMove.step3.title'),
        description: t('newMove.step3.desc'),
      },
    ],
    [t]
  );

  const handleNext = (data: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((prev) => prev + 1);
  };
  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error(t('customer.form.loginRequired'));
      return;
    }

    const payload = {
      customer_id: Number(user.id),
      pickup_address: (formData as { pickupAddress?: string }).pickupAddress,
      pickup_postal_code: (formData as { pickupPostalCode?: string }).pickupPostalCode || null,
      dropoff_address: (formData as { dropoffAddress?: string }).dropoffAddress,
      dropoff_postal_code: (formData as { dropoffPostalCode?: string }).dropoffPostalCode || null,
      move_date: (formData as { moveDate?: string }).moveDate,
      country_code: (formData as { countryCode?: string }).countryCode || 'JP',
      service_area: (formData as { serviceArea?: string }).serviceArea || 'tokyo',
      payment_preference:
        (formData as { paymentPreference?: string }).paymentPreference || 'card',
      items: (formData as { items?: { name: string; quantity: number }[] }).items || [],
    };

    if (
      !payload.pickup_address ||
      !payload.dropoff_address ||
      !payload.move_date ||
      !payload.service_area ||
      !payload.payment_preference ||
      payload.items.length === 0
    ) {
      toast.error(t('customer.form.missing'));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data?.detail || t('customer.form.submitFailed');
        toast.error(message);
        return;
      }

      toast.success(t('customer.form.success'));
      setStep(1);
      setFormData({});
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = steps.find((s) => s.id === step);

  const stepLabels = [
    { id: 1, label: t('move.stepDetails') },
    { id: 2, label: t('move.stepItems') },
    { id: 3, label: t('move.stepConfirm') },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('newMove.title')}</h1>
          <p className="text-muted-foreground">{t('newMove.subtitle')}</p>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto" aria-label="progress">
        <ol className="flex items-center">
          {stepLabels.map((s, index) => {
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <li key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : isDone
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {s.id}
                  </div>
                  <span
                    className={`text-xs ${
                      isActive ? 'font-medium text-orange-700' : 'text-gray-500'
                    }`}
                  >
                    {t('move.progress')} {s.id}/{stepLabels.length} {s.label}
                  </span>
                </div>
                {index < stepLabels.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      isDone ? 'bg-orange-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>
            {t('newMove.stepLabel')} {currentStep?.id}: {currentStep?.title}
          </CardTitle>
          <CardDescription>{currentStep?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && <MoveDetailsForm onNext={handleNext} />}
          {step === 2 && <AddItemsForm onNext={handleNext} onBack={handleBack} />}
          {step === 3 && (
            <ConfirmationStep
              formData={formData}
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
