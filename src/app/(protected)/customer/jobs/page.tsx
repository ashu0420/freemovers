'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useI18n } from '@/components/providers/I18nProvider';

type Move = {
  id: number;
  status: string;
  from: string;
  serviceArea?: string;
  paymentPreference?: string;
  to: string;
  scheduledDate: string;
};

export default function CustomerJobsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [moves, setMoves] = useState<Move[]>([]);
  const [quotesByMove, setQuotesByMove] = useState<
    Record<number, { driverId: number; quotedRate: number; createdAt: string }[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/customer/moves?customer_id=${user.id}`);
        const data = await response.json();
        const loadedMoves = Array.isArray(data?.moves) ? data.moves : [];
        setMoves(loadedMoves);

        const quoteEntries = await Promise.all(
          loadedMoves.map(async (move: Move) => {
            try {
              const res = await fetch(`/api/customer/moves/${move.id}/quotes`);
              const quoteData = await res.json();
              return [move.id, Array.isArray(quoteData?.quotes) ? quoteData.quotes : []] as const;
            } catch {
              return [move.id, []] as const;
            }
          })
        );
        setQuotesByMove(Object.fromEntries(quoteEntries));
      } catch {
        setMoves([]);
        setQuotesByMove({});
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.id]);

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
      setMoves((prev) =>
        prev.map((move) =>
          move.id === moveId ? { ...move, status: 'scheduled' } : move
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    }
  };

  const handleCancelMove = async (moveId: number) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/customer/moves/${moveId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: Number(user.id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || t('customer.jobs.cancelError'));
        return;
      }
      toast.success(t('customer.jobs.cancelSuccess'));
      setMoves((prev) =>
        prev.map((move) => (move.id === moveId ? { ...move, status: 'cancelled' } : move))
      );
    } catch {
      toast.error(t('common.networkError'));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('jobs.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('jobs.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t('jobs.loading')}</div>
      ) : moves.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader>
            <CardTitle>{t('jobs.empty')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('jobs.emptyHint')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {moves.map((move) => (
            <Card key={move.id} className="border border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('customer.jobs.moveLabel', { id: String(move.id) })}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">
                    {move.status === 'pending'
                      ? t('customer.jobs.status.pending')
                      : move.status === 'scheduled'
                      ? t('customer.jobs.status.scheduled')
                      : move.status === 'in_progress'
                      ? t('customer.jobs.status.inProgress')
                      : move.status === 'completed'
                      ? t('customer.jobs.status.completed')
                      : t('customer.jobs.status.cancelled')}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="mr-2 h-4 w-4 text-orange-500" />
                  {move.from} → {move.to}
                </div>
                {(move.serviceArea || move.paymentPreference) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    {move.serviceArea && (
                      <span className="rounded-full bg-orange-50 px-2 py-1">
                        {t('driver.available.region')}: {t(`region.${move.serviceArea}`)}
                      </span>
                    )}
                    {move.paymentPreference && (
                      <span className="rounded-full bg-orange-50 px-2 py-1">
                        {t('driver.available.payment')}: {t(`payment.${move.paymentPreference}`)}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="mr-2 h-4 w-4 text-orange-500" />
                  <span>
                    {t('common.scheduledFor')}{' '}
                    <time dateTime={move.scheduledDate}>{move.scheduledDate}</time>
                  </span>
                </div>

                {move.status === 'pending' && (quotesByMove[move.id]?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                      {t('customer.quotes.title')}
                    </p>
                    <div className="space-y-2">
                      {quotesByMove[move.id]?.map((quote) => (
                        <div
                          key={`${move.id}-${quote.driverId}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm"
                        >
                          <div className="text-gray-700">
                            {t('customer.jobs.driverQuote', {
                              id: String(quote.driverId),
                              amount: quote.quotedRate.toFixed(2),
                            })}
                          </div>
                          <Button size="sm" onClick={() => handleAcceptQuote(move.id, quote.driverId)}>
                            {t('customer.quotes.accept')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(move.status === 'pending' || move.status === 'scheduled') && (
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleCancelMove(move.id)}>
                      {t('customer.jobs.cancel')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
