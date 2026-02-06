'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

type FlagMap = Record<string, boolean>;

interface FeatureFlagsContextType {
  flags: FlagMap;
  isEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FlagMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/flags', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { flags?: FlagMap };
      setFlags(data.flags ?? {});
    } catch {
      // Fail open: leave flags empty so isEnabled defaults to true.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Fail-open: unknown/not-yet-loaded flags are treated as enabled.
  const isEnabled = useCallback(
    (key: string) => flags[key] !== false,
    [flags]
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, isEnabled, refresh, isLoading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return ctx;
}

export function useFeatureFlag(key: string): boolean {
  return useFeatureFlags().isEnabled(key);
}
