'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/I18nProvider';
import { formatJPY } from '@/lib/utils';

interface ConfirmationStepProps {
  formData: {
    pickupAddress?: string;
    pickupPostalCode?: string;
    dropoffAddress?: string;
    dropoffPostalCode?: string;
    moveDate?: string;
    serviceArea?: string;
    paymentPreference?: string;
    items?: { name: string; quantity: number }[];
  };
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function ConfirmationStep({
  formData,
  onSubmit,
  onBack,
  isSubmitting = false,
}: ConfirmationStepProps) {
  const { t } = useI18n();

  const itemCount =
    (formData.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0) || 1;
  const estimatedTotal = 8000 + itemCount * 2500;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">{t('move.reviewSummary')}</p>

      <div>
        <h3 className="text-lg font-medium">{t('newMove.moveDetails')}</h3>
        <div className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
          <div className="py-3 flex justify-between text-sm font-medium">
            <dt className="text-gray-500">{t('newMove.pickup')}</dt>
            <dd className="text-gray-900 text-right">{formData.pickupAddress}</dd>
          </div>
          {!!formData.pickupPostalCode && (
            <div className="py-3 flex justify-between text-sm font-medium">
              <dt className="text-gray-500">{t('customer.form.pickupPostal')}</dt>
              <dd className="text-gray-900 text-right">{formData.pickupPostalCode}</dd>
            </div>
          )}
          <div className="py-3 flex justify-between text-sm font-medium">
            <dt className="text-gray-500">{t('newMove.dropoff')}</dt>
            <dd className="text-gray-900 text-right">{formData.dropoffAddress}</dd>
          </div>
          {!!formData.dropoffPostalCode && (
            <div className="py-3 flex justify-between text-sm font-medium">
              <dt className="text-gray-500">{t('customer.form.dropoffPostal')}</dt>
              <dd className="text-gray-900 text-right">{formData.dropoffPostalCode}</dd>
            </div>
          )}
          <div className="py-3 flex justify-between text-sm font-medium">
            <dt className="text-gray-500">{t('newMove.date')}</dt>
            <dd className="text-gray-900 text-right">{formData.moveDate}</dd>
          </div>
          {!!formData.serviceArea && (
            <div className="py-3 flex justify-between text-sm font-medium">
              <dt className="text-gray-500">{t('customer.form.serviceArea')}</dt>
              <dd className="text-gray-900 text-right">{t(`region.${formData.serviceArea}`)}</dd>
            </div>
          )}
          {!!formData.paymentPreference && (
            <div className="py-3 flex justify-between text-sm font-medium">
              <dt className="text-gray-500">{t('customer.form.paymentPreference')}</dt>
              <dd className="text-gray-900 text-right">{t(`payment.${formData.paymentPreference}`)}</dd>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">{t('newMove.items')}</h3>
        <div className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
          {formData.items?.map((item, index) => (
            <div key={index} className="py-3 flex justify-between text-sm font-medium">
              <dt className="text-gray-500">{item.name}</dt>
              <dd className="text-gray-900">x{item.quantity}</dd>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">{t('move.estimatedTotal')}</h3>
        <div className="mt-2 border-t border-b border-gray-200 py-3 flex justify-between text-sm font-medium">
          <dt className="text-gray-500">{t('move.estimatedTotal')}</dt>
          <dd className="text-gray-900 text-right">{formatJPY(estimatedTotal)}</dd>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          {t('newMove.backItems')}
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} isLoading={isSubmitting}>
          {t('newMove.submit')}
        </Button>
      </div>
    </div>
  );
}
