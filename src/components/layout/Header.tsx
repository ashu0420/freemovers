'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/providers/I18nProvider';

type NavItem = {
  name: string;
  href: string;
  userType?: 'customer' | 'driver';
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
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  const userType = user?.userType || 'customer';
  const filteredNav = navigation.filter(
    (item) => !item.userType || item.userType === userType
  );

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex
          ">
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
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
