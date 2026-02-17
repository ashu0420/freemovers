'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/providers/I18nProvider';

type NavItem = {
  name: string;
  href: string;
  userType?: 'customer' | 'driver' | 'admin';
};

const navigation: NavItem[] = [
  { name: 'nav.dashboard', href: '/customer/dashboard', userType: 'customer' },
  { name: 'nav.myJobs', href: '/customer/jobs', userType: 'customer' },
  { name: 'nav.profile', href: '/customer/profile', userType: 'customer' },
  { name: 'nav.dashboard', href: '/driver/dashboard', userType: 'driver' },
  { name: 'nav.availableJobs', href: '/driver/available-jobs', userType: 'driver' },
  { name: 'nav.profile', href: '/driver/profile', userType: 'driver' },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    router.push('/login');
  };

  // Close the mobile panel when clicking outside of it.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  if (!user) {
    return null;
  }

  const userType = user?.userType || 'customer';
  const filteredNav = isAdmin
    ? [{ name: 'Admin', href: '/admin/dashboard' } as NavItem]
    : navigation.filter((item) => !item.userType || item.userType === userType);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                FreeMovers
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {t(item.name)}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('app.language')}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as 'en' | 'ja')}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
              >
                <option value="en">EN</option>
                <option value="ja">JP</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-sm"
            >
              {t('common.signOut')}
            </Button>
          </div>

          {/* Hamburger toggle: visible only below the sm breakpoint */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile panel: visible only below the sm breakpoint */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200" ref={menuRef}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {t(item.name)}
                </Link>
              );
            })}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-500">{t('app.language')}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as 'en' | 'ja')}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
              >
                <option value="en">EN</option>
                <option value="ja">JP</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full text-sm"
            >
              {t('common.signOut')}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
