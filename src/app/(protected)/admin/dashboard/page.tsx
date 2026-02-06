'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeatureFlags } from '@/components/providers/FeatureFlagsProvider';

type AdminFlag = {
  key: string;
  label: string;
  description: string;
  group: string;
  enabled: boolean;
};

export default function AdminDashboardPage() {
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { refresh: refreshGlobalFlags } = useFeatureFlags();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/flags', { cache: 'no-store' });
      if (!res.ok) {
        toast.error('Failed to load feature flags.');
        return;
      }
      const data = (await res.json()) as { flags: AdminFlag[] };
      setFlags(data.flags ?? []);
    } catch {
      toast.error('Failed to load feature flags.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (flag: AdminFlag) => {
    const nextEnabled = !flag.enabled;
    setSavingKey(flag.key);
    // Optimistic update.
    setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: nextEnabled } : f)));
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flag.key, enabled: nextEnabled }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = (await res.json()) as { flags: AdminFlag[] };
      setFlags(data.flags ?? []);
      await refreshGlobalFlags();
      toast.success(`${flag.label} ${nextEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      // Revert on failure.
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: flag.enabled } : f)));
      toast.error(`Failed to update ${flag.label}.`);
    } finally {
      setSavingKey(null);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, AdminFlag[]>();
    for (const flag of flags) {
      const list = map.get(flag.group) ?? [];
      list.push(flag);
      map.set(flag.group, list);
    }
    return Array.from(map.entries());
  }, [flags]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin · Feature flags</h1>
        <p className="text-sm text-gray-600">
          Enable or disable product features. Changes take effect for all users on their next load.
        </p>
      </div>

      {grouped.map(([group, groupFlags]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-lg">{group}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-gray-100">
            {groupFlags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{flag.label}</p>
                  <p className="text-xs text-gray-500">{flag.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flag.enabled}
                  aria-label={flag.label}
                  disabled={savingKey === flag.key}
                  onClick={() => toggle(flag)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    flag.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      flag.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
