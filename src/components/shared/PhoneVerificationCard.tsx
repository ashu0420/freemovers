'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PhoneVerificationCardProps = {
  phone: string;
  initialVerified?: boolean;
  persistedPhone?: string;
  onVerifiedChange?: (verified: boolean) => void;
  className?: string;
};

function normalize(phone: string) {
  return phone.replace(/\s+/g, '').trim();
}

export function PhoneVerificationCard({
  phone,
  initialVerified = false,
  persistedPhone,
  onVerifiedChange,
  className,
}: PhoneVerificationCardProps) {
  const { t } = useI18n();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(initialVerified ? normalize(phone) : '');

  const normalizedPhone = useMemo(() => normalize(phone), [phone]);
  const normalizedPersisted = useMemo(
    () => (persistedPhone !== undefined ? normalize(persistedPhone) : undefined),
    [persistedPhone]
  );
  const needsSaveFirst =
    normalizedPersisted !== undefined &&
    normalizedPersisted.length > 0 &&
    normalizedPersisted !== normalizedPhone;
  const isVerified = normalizedPhone.length > 0 && verifiedPhone === normalizedPhone;

  useEffect(() => {
    if (initialVerified && normalizedPhone.length > 0 && !needsSaveFirst) {
      setVerifiedPhone(normalizedPhone);
    }
  }, [initialVerified, normalizedPhone, needsSaveFirst]);

  useEffect(() => {
    onVerifiedChange?.(isVerified);
  }, [isVerified, onVerifiedChange]);

  const sendCode = async () => {
    if (!normalizedPhone || needsSaveFirst) return;
    try {
      setIsSending(true);
      const response = await fetch('/api/auth/phone/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: normalizedPhone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.detail || t('phoneVerify.sendFailed'));
        return;
      }
      setCodeSent(true);
      toast.success(t('phoneVerify.codeSent'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const checkCode = async () => {
    if (!normalizedPhone || !code.trim()) {
      toast.error(t('phoneVerify.enterCode'));
      return;
    }
    try {
      setIsChecking(true);
      const response = await fetch('/api/auth/phone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: normalizedPhone,
          code: code.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.detail || t('phoneVerify.checkFailed'));
        return;
      }
      setVerifiedPhone(normalizedPhone);
      setCodeSent(false);
      setCode('');
      toast.success(t('phoneVerify.verifiedSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className={`rounded-md border border-orange-100 bg-orange-50/30 p-3 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-800">{t('phoneVerify.title')}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isVerified ? t('phoneVerify.verified') : t('phoneVerify.notVerified')}
        </span>
      </div>

      {needsSaveFirst && (
        <p className="mt-2 text-xs text-amber-700">{t('phoneVerify.savePhoneFirst')}</p>
      )}

      {!isVerified && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!normalizedPhone || needsSaveFirst || isSending}
              onClick={sendCode}
            >
              {codeSent ? t('phoneVerify.resendCode') : t('phoneVerify.sendCode')}
            </Button>
          </div>

          {codeSent && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('phoneVerify.codePlaceholder')}
                className="h-9"
              />
              <Button
                type="button"
                size="sm"
                disabled={!code.trim() || isChecking}
                onClick={checkCode}
              >
                {t('phoneVerify.verifyCode')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
