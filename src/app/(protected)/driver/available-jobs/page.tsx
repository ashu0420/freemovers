'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, DollarSign, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/providers/I18nProvider';
import { formatJPY } from '@/lib/utils';

type Job = {
  id: string;
  title: string;
  customerName: string;
  customerId?: number;
  pickupLocation: string;
  dropoffLocation: string;
  serviceArea?: string;
  paymentPreference?: string;
  scheduledDate: string;
  estimatedEarnings: number;
  myQuote?: number | null;
  myQuoteAt?: string | null;
  status: string;
  distance: string;
};

export default function AvailableJobsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [sentQuotes, setSentQuotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading && (!user || user.userType !== 'driver')) {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        setIsFetching(true);
        const response = await fetch(`/api/driver/jobs/available?driver_id=${user?.id ?? ''}`);
        if (!response.ok) {
          throw new Error('fetch failed');
        }
        const data = await response.json();
        const loadedJobs = Array.isArray(data?.jobs) ? data.jobs : [];
        setJobs(loadedJobs);
        setQuotes(
          Object.fromEntries(
            loadedJobs
              .filter((job: Job) => Number.isFinite(job.myQuote))
              .map((job: Job) => [job.id, String(Number(job.myQuote))])
          )
        );
        setSentQuotes(
          Object.fromEntries(
            loadedJobs
              .filter((job: Job) => Number.isFinite(job.myQuote))
              .map((job: Job) => [job.id, true])
          )
        );
        setError(false);
      } catch {
        setJobs([]);
        setError(true);
      } finally {
        setIsFetching(false);
      }
    };

    load();
  }, [user, isLoading, router]);

  const handleQuote = async (jobId: string) => {
    if (!user?.id) return;
    const quotedRate = Number(quotes[jobId]);
    if (!Number.isFinite(quotedRate) || quotedRate <= 0) {
      toast.error(t('driver.available.quoteInvalid'));
      return;
    }
    try {
      const response = await fetch(`/api/driver/jobs/${jobId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: Number(user.id), quoted_rate: quotedRate }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.detail || t('driver.available.quoteError'));
        return;
      }
      toast.success(t('driver.available.quoteSent'));
      setSentQuotes((prev) => ({ ...prev, [jobId]: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.networkError');
      toast.error(message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('driver.available.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('driver.available.subtitle')}
        </p>
      </div>

      {isFetching ? (
        <div className="text-sm text-muted-foreground">{t('driver.available.loading')}</div>
      ) : error ? (
        <Card className="border border-dashed">
          <CardHeader>
            <CardTitle>{t('common.networkError')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('driver.available.loading')}</div>
      ) : jobs.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader>
            <CardTitle>{t('driver.available.empty')}</CardTitle>
            <CardDescription>{t('driver.available.emptyHint')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="border border-orange-100">
              <CardHeader className="space-y-1">
                <CardTitle>{t('driver.jobs.title')}</CardTitle>
                <CardDescription>
                  {job.customerId
                    ? t('driver.jobs.customer', { id: String(job.customerId) })
                    : job.customerName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span>{job.pickupLocation} → {job.dropoffLocation}</span>
                  </div>
                  {job.serviceArea && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        {t('driver.available.region')}: {t(`region.${job.serviceArea}`)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span>{job.scheduledDate}</span>
                  </div>
                  {job.paymentPreference && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        {t('driver.available.payment')}: {t(`payment.${job.paymentPreference}`)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    <span>{formatJPY(job.estimatedEarnings)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-orange-500" />
                    <span>
                      {job.status === 'pending'
                        ? t('driver.jobs.status.pending')
                        : job.status === 'accepted'
                        ? t('driver.jobs.status.accepted')
                        : job.status === 'in_progress'
                        ? t('driver.jobs.status.inProgress')
                        : job.status === 'completed'
                        ? t('driver.jobs.status.completed')
                        : t('driver.jobs.status.cancelled')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <label htmlFor={`quote-${job.id}`} className="text-sm font-medium text-gray-700">
                      {t('driver.available.quote')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`quote-${job.id}`}
                        className="h-10 w-32 rounded-md border border-orange-100 bg-orange-50/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0"
                        value={quotes[job.id] ?? ''}
                        onChange={(event) =>
                          setQuotes((prev) => ({ ...prev, [job.id]: event.target.value }))
                        }
                        type="number"
                        min={0}
                        step="1"
                      />
                    </div>
                    {Number.isFinite(job.myQuote) && (
                      <p className="text-xs text-gray-500">
                        {t('driver.available.lastQuote', {
                          amount: formatJPY(Number(job.myQuote)),
                        })}
                      </p>
                    )}
                  </div>
                  <Button onClick={() => handleQuote(job.id)}>
                    {sentQuotes[job.id]
                      ? t('driver.available.resendQuote')
                      : t('driver.available.sendQuote')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
