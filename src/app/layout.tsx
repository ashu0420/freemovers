import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProviderWrapper from "@/components/providers/AuthProviderWrapper";
import { Footer } from '@/components/layout/Footer';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { FeatureFlagsProvider } from '@/components/providers/FeatureFlagsProvider';

export const metadata: Metadata = {
  title: "FreeMovers - Your Moving Solution",
  description: "Connect with professional movers or offer your moving services",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        className="font-sans bg-gray-50 min-h-screen"
        suppressHydrationWarning={true}
      >
        <I18nProvider>
          <AuthProviderWrapper>
            <FeatureFlagsProvider>
              <div className="flex flex-col min-h-screen">
                <main className="flex-grow">{children}</main>
                <Footer />
              </div>
              <Toaster richColors position="top-right" />
            </FeatureFlagsProvider>
          </AuthProviderWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
