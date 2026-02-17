'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ChevronDown, ChevronUp, ListChecks, MapPin, PlusCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/LocationInput';
import { useI18n } from '@/components/providers/I18nProvider';
import { JP_LAUNCH_REGIONS, PAYMENT_OPTIONS, normalizePostalCode } from '@/lib/japan';
import { formatJPY } from '@/lib/utils';
import { MoversCoinTeaser } from '@/components/shared/MoversCoinTeaser';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [error, setError] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [recentMoves, setRecentMoves] = useState<
    { id: number; status: string; from: string; to: string; scheduledDate: string }[]
  >([]);
  const [quotesByMove, setQuotesByMove] = useState<
    Record<number, { driverId: number; quotedRate: number; createdAt: string }[]>
  >({});

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const [movesRes, upcomingRes] = await Promise.all([
          fetch(`/api/customer/moves?customer_id=${user.id}`),
          fetch(`/api/customer/moves/upcoming?customer_id=${user.id}`),
        ]);
        const movesData = await movesRes.json();
        const upcomingData = await upcomingRes.json();

        setRecentMoves(Array.isArray(movesData?.moves) ? movesData.moves : []);
        setUpcomingCount(Number.isFinite(upcomingData?.upcoming) ? upcomingData.upcoming : 0);
        setError(false);
      } catch {
        setRecentMoves([]);
        setUpcomingCount(0);
        setError(true);
      }
    };

    load();
  }, [user?.id]);

  useEffect(() => {
    if (recentMoves.length === 0) return;
    const loadQuotes = async () => {
      const entries = await Promise.all(
        recentMoves.map(async (move) => {
          try {
            const response = await fetch(`/api/customer/moves/${move.id}/quotes`);
            const data = await response.json();
            return [move.id, Array.isArray(data?.quotes) ? data.quotes : []] as const;
          } catch {
            return [move.id, []] as const;
          }
        })
      );
      setQuotesByMove(Object.fromEntries(entries));
    };
    loadQuotes();
  }, [recentMoves]);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupPostalCode: '',
    dropoffAddress: '',
    dropoffPostalCode: '',
    moveDate: '',
    countryCode: 'JP',
    serviceArea: 'tokyo',
    paymentPreference: 'card',
  });
  const [items, setItems] = useState([{ name: '', quantity: 1 }]);

  const handleItemChange = (index: number, key: 'name' | 'quantity', value: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [key]: key === 'quantity' ? Number(value) : value } : item
      )
    );
  };

  const addItem = () => setItems((prev) => [...prev, { name: '', quantity: 1 }]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) {
      toast.error(t('customer.form.loginRequired'));
      return;
    }

    if (!formData.pickupAddress || !formData.dropoffAddress || !formData.moveDate || !formData.serviceArea || !formData.paymentPreference) {
      toast.error(t('customer.form.missing'));
      return;
    }

    const validItems = items.filter((item) => item.name && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error(t('customer.form.missing'));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/customer/moves/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: Number(user.id),
          pickup_address: formData.pickupAddress,
          pickup_postal_code: formData.pickupPostalCode || null,
          dropoff_address: formData.dropoffAddress,
          dropoff_postal_code: formData.dropoffPostalCode || null,
          move_date: formData.moveDate,
          country_code: formData.countryCode,
          service_area: formData.serviceArea,
          payment_preference: formData.paymentPreference,
          items: validItems,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || t('customer.form.submitFailed'));
        return;
      }
      toast.success(t('customer.form.success'));
      setIsFormOpen(false);
      setUpcomingCount((prev) => prev + 1);
      setRecentMoves((prev) => [
        {
          id: data?.move?.id ?? Date.now(),
          status: 'pending',
          from: formData.pickupAddress,
          to: formData.dropoffAddress,
          scheduledDate: formData.moveDate,
        },
        ...prev,
      ]);
      setQuotesByMove((prev) => ({
        ...prev,
        [data?.move?.id ?? Date.now()]: [],
      }));
      setFormData({
        pickupAddress: '',
        pickupPostalCode: '',
        dropoffAddress: '',
        dropoffPostalCode: '',
        moveDate: '',
        countryCode: 'JP',
        serviceArea: 'tokyo',
        paymentPreference: 'card',
      });
      setItems([{ name: '', quantity: 1 }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptQuote = async (moveId: number, driverId: number) => {
    try {
      const response = await fetch(`/api/customer/moves/${moveId}/accept-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || t('customer.quotes.acceptError'));
        return;
      }
      toast.success(t('customer.quotes.acceptSuccess'));
      setRecentMoves((prev) =>
        prev.map((move) =>
          move.id === moveId ? { ...move, status: 'scheduled' } : move
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    }
  };

  const handleNegotiateQuote = async (moveId: number, driverId: number) => {
    try {
      const response = await fetch(`/api/customer/moves/${moveId}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driverId,
          message: 'Customer wants to renegotiate the quote.',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || t('customer.quotes.negotiateError'));
        return;
      }
      toast.success(t('customer.quotes.negotiateSuccess'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    }
  };

  const autoFillAddressFromPostal = async (kind: 'pickup' | 'dropoff') => {
    const postalCode = normalizePostalCode(
      kind === 'pickup' ? formData.pickupPostalCode : formData.dropoffPostalCode
    );
    if (postalCode.length !== 7) {
      toast.error(t('location.invalidPostal'));
      return;
    }
    try {
      const response = await fetch(`/api/geo/jp-postal?postal_code=${postalCode}`);
      const data = await response.json();
      if (!response.ok || !data?.address) {
        toast.error(data?.detail || t('location.postalNotFound'));
        return;
      }
      if (kind === 'pickup') {
        setFormData((prev) => ({
          ...prev,
          pickupPostalCode: postalCode,
          pickupAddress: data.address,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          dropoffPostalCode: postalCode,
          dropoffAddress: data.address,
        }));
      }
    } catch {
      toast.error(t('location.postalLookupFailed'));
    }
  };

  return (
    <div className="space-y-10">
      {error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6">
          <p className="text-sm text-muted-foreground">{t('common.networkError')}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      )}
      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-100 px-6 py-10 shadow-sm">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-orange-200/60 blur-2xl" />
        <div className="absolute -bottom-10 left-10 h-44 w-44 rounded-full bg-amber-300/40 blur-3xl" />
        <div className="absolute right-8 bottom-6 hidden h-32 w-32 lg:block">
          <svg viewBox="0 0 120 120" className="h-full w-full text-orange-400/50">
            <path
              d="M10 70c20-30 50-50 90-40-8 30-30 70-70 80-20 6-30-18-20-40z"
              fill="currentColor"
            />
            <path
              d="M20 30c20-10 50-10 80 10-10 12-30 18-50 18-15 0-25-8-30-28z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-600">
              {t('customer.dashboard.title')}
            </p>
            <h1 className="text-3xl font-semibold text-gray-900 lg:text-4xl">
              {t('customer.dashboard.welcome', { name: user?.firstName || 'there' })}
            </h1>
            <p className="text-sm text-gray-600 lg:text-base">
              {t('customer.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{t('customer.dashboard.upcoming')}</p>
              <p className="text-2xl font-semibold text-gray-900">{upcomingCount}</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">{t('customer.dashboard.totalMoves')}</p>
              <p className="text-2xl font-semibold text-gray-900">{recentMoves.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section
        className={
          isFormOpen
            ? 'grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
            : 'flex flex-col gap-6'
        }
      >
        <Card
          className="border-0 bg-white shadow-[0_20px_60px_-40px_rgba(234,88,12,0.6)]"
          onClick={() => setIsFormOpen((prev) => !prev)}
        >
          <CardHeader className="flex flex-col gap-3 border-b border-orange-100/70 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {t('customer.dashboard.createMove')}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {t('customer.dashboard.createMoveHint')}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-orange-200 bg-white p-2 text-orange-600 transition hover:bg-orange-50"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsFormOpen((prev) => !prev);
                }}
                aria-label={
                  isFormOpen ? t('customer.dashboard.ariaCollapse') : t('customer.dashboard.ariaExpand')
                }
              >
                {isFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </CardHeader>
          <CardContent onClick={(event) => event.stopPropagation()}>
            <div
              className={`origin-top overflow-hidden transition-[max-height,opacity,transform] duration-400 ease-out ${
                isFormOpen
                  ? 'max-h-[2000px] opacity-100 scale-y-100 translate-y-0'
                  : 'max-h-0 opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
              }`}
            >
              <form className="space-y-6 pt-2 overflow-auto pr-2" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cd-pickupPostal" className="text-sm font-medium text-gray-700">
                      {t('customer.form.pickupPostal')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="cd-pickupPostal"
                        value={formData.pickupPostalCode}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            pickupPostalCode: normalizePostalCode(event.target.value),
                          }))
                        }
                        placeholder="1000001"
                        className="bg-orange-50/40"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => autoFillAddressFromPostal('pickup')}
                      >
                        {t('location.autofill')}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cd-dropoffPostal" className="text-sm font-medium text-gray-700">
                      {t('customer.form.dropoffPostal')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="cd-dropoffPostal"
                        value={formData.dropoffPostalCode}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            dropoffPostalCode: normalizePostalCode(event.target.value),
                          }))
                        }
                        placeholder="1000001"
                        className="bg-orange-50/40"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => autoFillAddressFromPostal('dropoff')}
                      >
                        {t('location.autofill')}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cd-pickup" className="text-sm font-medium text-gray-700">
                      {t('customer.form.pickup')}
                    </label>
                    <LocationInput
                      id="cd-pickup"
                      value={formData.pickupAddress}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, pickupAddress: value }))
                      }
                      placeholder={t('customer.form.pickup')}
                      inputClassName="bg-orange-50/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cd-dropoff" className="text-sm font-medium text-gray-700">
                      {t('customer.form.dropoff')}
                    </label>
                    <LocationInput
                      id="cd-dropoff"
                      value={formData.dropoffAddress}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, dropoffAddress: value }))
                      }
                      placeholder={t('customer.form.dropoff')}
                      inputClassName="bg-orange-50/40"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cd-moveDate" className="text-sm font-medium text-gray-700">
                      {t('customer.form.date')}
                    </label>
                    <Input
                      id="cd-moveDate"
                      type="date"
                      value={formData.moveDate}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, moveDate: event.target.value }))
                      }
                      className="bg-orange-50/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cd-serviceArea" className="text-sm font-medium text-gray-700">
                      {t('customer.form.serviceArea')}
                    </label>
                    <select
                      id="cd-serviceArea"
                      value={formData.serviceArea}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, serviceArea: event.target.value }))
                      }
                      className="h-10 w-full rounded-md border border-input bg-orange-50/40 px-3 text-sm"
                    >
                      {JP_LAUNCH_REGIONS.map((region) => (
                        <option key={region.value} value={region.value}>
                          {t(`region.${region.value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="cd-paymentPreference" className="text-sm font-medium text-gray-700">
                      {t('customer.form.paymentPreference')}
                    </label>
                    <select
                      id="cd-paymentPreference"
                      value={formData.paymentPreference}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, paymentPreference: event.target.value }))
                      }
                      className="h-10 w-full rounded-md border border-input bg-orange-50/40 px-3 text-sm"
                    >
                      {PAYMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(`payment.${option.value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      {t('customer.form.items')}
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('customer.form.addItem')}
                    </Button>
                  </div>
                  {items.map((item, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-6 items-end">
                      <div className="md:col-span-4 space-y-2">
                        <label htmlFor={`cd-itemName-${index}`} className="text-sm font-medium text-gray-700">
                          {t('customer.form.itemName')}
                        </label>
                        <Input
                          id={`cd-itemName-${index}`}
                          value={item.name}
                          onChange={(event) => handleItemChange(index, 'name', event.target.value)}
                          placeholder={t('customer.form.itemName')}
                          className="bg-white"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-2">
                        <label htmlFor={`cd-itemQty-${index}`} className="text-sm font-medium text-gray-700">
                          {t('customer.form.quantity')}
                        </label>
                        <Input
                          id={`cd-itemQty-${index}`}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            handleItemChange(index, 'quantity', event.target.value)
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                    {t('customer.form.submit')}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {isFormOpen ? (
          <div className="space-y-4">
            <Card className="border border-orange-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('customer.stats.upcoming')}</CardTitle>
                <Calendar className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{upcomingCount}</div>
                <p className="text-xs text-gray-500">{t('customer.stats.upcomingHint')}</p>
              </CardContent>
            </Card>
            <Card className="border border-orange-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('customer.stats.recent')}</CardTitle>
                <ListChecks className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{recentMoves.length}</div>
                <p className="text-xs text-gray-500">{t('customer.stats.recentHint')}</p>
              </CardContent>
            </Card>
            <Card className="border border-orange-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('customer.stats.saved')}</CardTitle>
                <MapPin className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">0</div>
                <p className="text-xs text-gray-500">{t('customer.stats.savedHint')}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border border-orange-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('customer.stats.upcoming')}</CardTitle>
                <Calendar className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{upcomingCount}</div>
                <p className="text-xs text-gray-500">{t('customer.stats.upcomingHint')}</p>
              </CardContent>
            </Card>
            <Card className="border border-orange-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('customer.stats.recent')}</CardTitle>
                <ListChecks className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{recentMoves.length}</div>
                <p className="text-xs text-gray-500">{t('customer.stats.recentHint')}</p>
              </CardContent>
            </Card>
            <Card className="border border-orange-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('customer.stats.saved')}</CardTitle>
                <MapPin className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">0</div>
                <p className="text-xs text-gray-500">{t('customer.stats.savedHint')}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <MoversCoinTeaser showBalance />

      <section>
        <Card className="border border-orange-100 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {t('customer.recent.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMoves.length === 0 ? (
              <div className="text-sm text-gray-500 py-6">{t('customer.recent.empty')}</div>
            ) : (
              <ul role="list" className="divide-y divide-orange-100">
                {recentMoves.map((move) => (
                  <li key={move.id} className="py-4">
                    <div className="rounded-2xl border border-orange-100/70 bg-orange-50/30 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-orange-700">
                          {t('customer.jobs.moveLabel', { id: String(move.id) })}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              move.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : move.status === 'in_progress'
                                ? 'bg-orange-200 text-orange-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {move.status === 'pending'
                              ? t('customer.jobs.status.pending')
                              : move.status === 'in_progress'
                              ? t('customer.jobs.status.inProgress')
                              : move.status === 'scheduled'
                              ? t('customer.jobs.status.scheduled')
                              : t('customer.jobs.status.completed')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-orange-400" />
                          {move.from} to {move.to}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-orange-400" />
                          <span>
                            {t('common.scheduledFor')}{' '}
                            <time dateTime={move.scheduledDate}>{move.scheduledDate}</time>
                          </span>
                        </div>
                      </div>
                      {move.status === 'pending' && (quotesByMove[move.id]?.length ?? 0) > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                            {t('customer.quotes.title')}
                          </p>
                          <div className="space-y-2">
                            {quotesByMove[move.id]?.map((quote) => (
                              <div
                                key={`${move.id}-${quote.driverId}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm"
                              >
                                <div className="text-gray-700">
                                  {t('customer.jobs.driverQuote', {
                                    id: String(quote.driverId),
                                    amount: formatJPY(quote.quotedRate),
                                  })}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcceptQuote(move.id, quote.driverId)}
                                  >
                                    {t('customer.quotes.accept')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleNegotiateQuote(move.id, quote.driverId)}
                                  >
                                    {t('customer.quotes.negotiate')}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
