'use client';

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap, Lock, ShieldCheck, Headset } from 'lucide-react';
import { useI18n } from '@/components/providers/I18nProvider';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  const portalHref = user?.userType ? `/${user.userType}/dashboard` : '/login';
  const featureCards = [
    {
      title: t('public.features.fastTitle'),
      description: t('public.features.fastDesc'),
      icon: Zap,
      accent: 'from-amber-400 to-orange-500',
    },
    {
      title: t('public.features.secureTitle'),
      description: t('public.features.secureDesc'),
      icon: Lock,
      accent: 'from-orange-400 to-orange-600',
    },
    {
      title: t('public.features.verifiedTitle'),
      description: t('public.features.verifiedDesc'),
      icon: ShieldCheck,
      accent: 'from-rose-400 to-orange-500',
    },
    {
      title: t('public.features.supportTitle'),
      description: t('public.features.supportDesc'),
      icon: Headset,
      accent: 'from-yellow-400 to-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-orange-200/50 blur-3xl" />
          <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-amber-300/40 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-orange-600">
                FreeMovers
              </div>
              <h1 className="text-4xl font-semibold text-gray-900 sm:text-5xl">
                <span className="block">{t('public.hero.titleLine1')}</span>
                <span className="block text-orange-600">{t('public.hero.titleLine2')}</span>
              </h1>
              <p className="text-base text-gray-600 sm:text-lg">
                {t('public.hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={portalHref}
                  className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700"
                >
                  {user ? t('public.portal') : t('public.hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                {!user && (
                  <Link
                    href="/request-quote"
                    className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                  >
                    {t('guest.quickCta')}
                  </Link>
                )}
                {!user && (
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  >
                    {t('public.signUp')}
                  </Link>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    title: t('public.features.fastTitle'),
                    desc: t('public.features.fastDesc'),
                    icon: Zap,
                  },
                  {
                    title: t('public.features.secureTitle'),
                    desc: t('public.features.secureDesc'),
                    icon: Lock,
                  },
                  {
                    title: t('public.features.verifiedTitle'),
                    desc: t('public.features.verifiedDesc'),
                    icon: ShieldCheck,
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-orange-100/80 bg-gradient-to-b from-white to-orange-50/30 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-600">
                      {item.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-6 -top-6 h-full w-full rounded-[32px] border border-orange-200 bg-white/60" />
              <div className="relative overflow-hidden rounded-[32px] border border-orange-200 bg-white shadow-2xl shadow-orange-100">
                <Image
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2850&q=80"
                  alt="Moving truck with workers"
                  width={900}
                  height={700}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/50 to-white py-20">
        <div className="absolute left-1/2 top-0 h-44 w-[32rem] -translate-x-1/2 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-600">
              {t('public.features.title')}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl">
              {t('public.features.subtitle')}
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((item) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100"
              >
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-lg shadow-orange-200/70`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm sm:grid-cols-3">
            <div className="rounded-xl bg-orange-50 p-3 text-center">
              <p className="text-xl font-semibold text-orange-700">10k+</p>
              <p className="text-xs uppercase tracking-[0.18em] text-orange-600/80">
                {t('public.insights.requests')}
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3 text-center">
              <p className="text-xl font-semibold text-orange-700">4.8/5</p>
              <p className="text-xs uppercase tracking-[0.18em] text-orange-600/80">
                {t('public.insights.satisfaction')}
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3 text-center">
              <p className="text-xl font-semibold text-orange-700">24/7</p>
              <p className="text-xs uppercase tracking-[0.18em] text-orange-600/80">
                {t('public.insights.support')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500">
        <div className="max-w-4xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">{t('public.cta.title1')}</span>
            <span className="block">{t('public.cta.title2')}</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-orange-50">
            {t('public.cta.subtitle')}
          </p>
          <Link
            href={portalHref}
            className="mt-8 w-full inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-base font-semibold text-orange-600 shadow-lg shadow-orange-200 hover:bg-orange-50 sm:w-auto"
          >
            {user ? t('public.portal') : t('public.cta.button')}
          </Link>
        </div>
      </div>
      <footer className="border-t border-orange-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-gray-500 sm:flex-row">
          <span>© FreeMovers</span>
          <div className="flex items-center gap-4">
            <Link href="/legal/terms" className="hover:text-gray-700">
              {t('legal.terms')}
            </Link>
            <Link href="/legal/privacy" className="hover:text-gray-700">
              {t('legal.privacy')}
            </Link>
            <Link href="/legal/commerce" className="hover:text-gray-700">
              {t('legal.commerce')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
