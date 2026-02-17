'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, MapPin, Loader2, CheckCircle, Star, Briefcase, Compass } from 'lucide-react';
import { useI18n } from '@/components/providers/I18nProvider';
import { formatJPY } from '@/lib/utils';

type JobStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

interface Job {
  id: string;
  title: string;
  customerName: string;
  customerId?: number;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledDate: string;
  estimatedEarnings: number;
  status: JobStatus;
  distance: string;
}

export default function DriverDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [recentActivity, setRecentActivity] = useState<Job[]>([]);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    jobsCompleted: 0,
    rating: 4.8,
    activeJobs: 0,
  });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user?.userType !== 'driver') {
      router.push('/customer/dashboard');
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const [jobsRes, recentRes, statsRes] = await Promise.all([
          fetch(`/api/driver/jobs?driver_id=${user?.id}`),
          fetch(`/api/driver/jobs/recent?driver_id=${user?.id}`),
          fetch(`/api/driver/stats?driver_id=${user?.id}`),
        ]);

        if (!jobsRes.ok || !recentRes.ok || !statsRes.ok) {
          throw new Error('fetch failed');
        }

        const jobsData = await jobsRes.json();
        const recentData = await recentRes.json();
        const statsData = await statsRes.json();

        setUpcomingJobs(Array.isArray(jobsData?.jobs) ? jobsData.jobs : []);
        setRecentActivity(Array.isArray(recentData?.jobs) ? recentData.jobs : []);
        setStats({
          totalEarnings: statsData?.totalEarnings ?? 0,
          jobsCompleted: statsData?.jobsCompleted ?? 0,
          rating: statsData?.rating ?? 0,
          activeJobs: statsData?.activeJobs ?? 0,
        });
        setError(false);
      } catch {
        setUpcomingJobs([]);
        setRecentActivity([]);
        setStats({
          totalEarnings: 0,
          jobsCompleted: 0,
          rating: 0,
          activeJobs: 0,
        });
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user, isAuthLoading, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: JobStatus) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
      pending: t('driver.jobs.status.pending'),
      accepted: t('driver.jobs.status.accepted'),
      in_progress: t('driver.jobs.status.inProgress'),
      completed: t('driver.jobs.status.completed'),
      cancelled: t('driver.jobs.status.cancelled'),
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>
        {statusLabels[status]}
      </span>
    );
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-sm text-muted-foreground">{t('common.networkError')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-8 py-10 text-white">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute right-6 top-10 hidden h-28 w-28 rounded-3xl border border-white/20 bg-white/10 backdrop-blur lg:block" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">
              {t('driver.dashboard.title')}
            </p>
            <h1 className="text-3xl font-semibold lg:text-4xl">
              {t('driver.dashboard.welcome', { name: user?.firstName || 'Driver' })}
            </h1>
            <p className="text-sm text-slate-200">
              {t('driver.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-white/10 text-white hover:bg-white/20"
              variant="outline"
              onClick={() => router.push('/driver/available-jobs')}
            >
              <Compass className="mr-2 h-4 w-4" />
              {t('driver.dashboard.findJobs')}
            </Button>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-200">{t('driver.dashboard.activeJobs')}</p>
              <p className="text-2xl font-semibold">{stats.activeJobs}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('driver.dashboard.totalEarnings')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">{t('driver.dashboard.totalEarningsHint')}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('driver.dashboard.jobsCompleted')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.jobsCompleted}</div>
            <p className="text-xs text-muted-foreground">{t('driver.dashboard.completedHint')}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('driver.dashboard.activeJobsCard')}</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">{t('driver.dashboard.activeHint')}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('driver.dashboard.rating')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rating}</div>
            <p className="text-xs text-muted-foreground">
              {stats.rating > 0 ? t('driver.dashboard.ratingHint') : t('driver.dashboard.ratingEmpty')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-100">
          <CardHeader>
            <CardTitle>{t('driver.dashboard.upcomingTitle')}</CardTitle>
            <CardDescription>{t('driver.dashboard.upcomingDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingJobs.length > 0 ? (
              <div className="space-y-4">
                {upcomingJobs.map((job: Job) => (
                  <div key={job.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{t('driver.jobs.title')}</h3>
                        <p className="text-sm text-muted-foreground">
                          {job.customerId
                            ? t('driver.jobs.customer', { id: String(job.customerId) })
                            : job.customerName}
                        </p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{job.distance} from {job.pickupLocation}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(job.scheduledDate)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-lg font-bold text-green-600">
                        {formatJPY(job.estimatedEarnings)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/driver/jobs/${job.id}`)}
                      >
                        {t('driver.jobs.viewDetails')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-2">{t('driver.dashboard.noUpcoming')}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/driver/available-jobs')}
                >
                  {t('driver.dashboard.findAvailable')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-100">
          <CardHeader>
            <CardTitle>{t('driver.dashboard.recentTitle')}</CardTitle>
            <CardDescription>{t('driver.dashboard.recentDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <ul className="space-y-4">
                {recentActivity.map((job: Job) => (
                  <li key={job.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                         <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t('driver.jobs.title')}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(job.scheduledDate)}</p>
                      </div>
                    </div>
                    <span className="font-medium text-green-600">+{formatJPY(job.estimatedEarnings)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('driver.dashboard.recentEmpty')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
