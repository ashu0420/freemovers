'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, MapPinned, Search, X } from 'lucide-react';
import { useI18n } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';

type LocationOption = {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

type LocationInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  allowCurrentLocation?: boolean;
};

export function LocationInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  buttonClassName,
  allowCurrentLocation = true,
}: LocationInputProps) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<LocationOption[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchTouched, setMapSearchTouched] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressNextLookupRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<{
    setView: (coords: [number, number], zoom?: number) => void;
    getZoom: () => number;
    remove: () => void;
    on: (event: string, cb: (event: { latlng: { lat: number; lng: number } }) => void) => void;
    invalidateSize: () => void;
  } | null>(null);
  const markerRef = useRef<{ setLatLng: (coords: [number, number]) => void } | null>(null);
  const leafletRef = useRef<{
    Map: new (container: HTMLElement) => {
      setView: (coords: [number, number], zoom?: number) => void;
      getZoom: () => number;
      remove: () => void;
      on: (event: string, cb: (event: { latlng: { lat: number; lng: number } }) => void) => void;
      invalidateSize: () => void;
    };
    Icon: {
      Default: {
        prototype: { _getIconUrl?: () => string };
        mergeOptions: (options: Record<string, string>) => void;
      };
    };
    TileLayer: new (
      urlTemplate: string,
      options: { attribution: string }
    ) => { addTo: (map: unknown) => void };
    marker: (coords: [number, number]) => { addTo: (map: unknown) => { setLatLng: (coords: [number, number]) => void } };
  } | null>(null);

  const parseCountryCode = () => {
    if (typeof navigator === 'undefined') return null;
    const lang = navigator.language || '';
    const parts = lang.split('-');
    if (parts.length < 2) return null;
    const code = parts[parts.length - 1]?.toLowerCase();
    return code && code.length === 2 ? code : null;
  };

  const fetchNominatim = useCallback(async (
    searchText: string,
    signal: AbortSignal,
    country?: string
  ): Promise<LocationOption[]> => {
    const params = new URLSearchParams({
      format: 'json',
      q: searchText,
      addressdetails: '1',
      limit: '8',
      dedupe: '1',
    });

    if (country) {
      params.set('countrycodes', country);
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal,
      headers: {
        'Accept-Language': locale,
      },
    });

    if (!response.ok) return [];
    const data = (await response.json()) as LocationOption[];
    return Array.isArray(data) ? data : [];
  }, [locale]);

  const rankResults = useCallback((searchText: string, list: LocationOption[]) => {
    const normalized = searchText.trim().toLowerCase();
    const unique = new Map<string, LocationOption>();

    for (const item of list) {
      const key = `${item.display_name}|${item.lat}|${item.lon}`;
      if (!unique.has(key)) unique.set(key, item);
    }

    return Array.from(unique.values())
      .map((item) => {
        const display = item.display_name.toLowerCase();
        let score = item.importance ?? 0;

        if (display.startsWith(normalized)) score += 2;
        if (display.includes(normalized)) score += 1;

        if (currentCoords) {
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            const km = distanceKm(currentCoords.lat, currentCoords.lon, lat, lon);
            score += Math.max(0, 1.5 - km / 100);
          }
        }

        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.item);
  }, [currentCoords]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setCountryCode(parseCountryCode());
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!mapOpen) return;
    const existing = document.querySelector(
      'link[data-leaflet-css="true"]'
    ) as HTMLLinkElement | null;
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.dataset.leafletCss = 'true';
    document.head.appendChild(link);
  }, [mapOpen]);

  useEffect(() => {
    if (!mapOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      const LeafletModule = await import('leaflet');
      leafletRef.current = LeafletModule;

      if (cancelled) return;

      const mapContainer = mapContainerRef.current;
      if (!mapContainer) return;
      if (mapInstanceRef.current) return;

      const center = mapCoords ?? currentCoords ?? { lat: 20.5937, lon: 78.9629 };
      const map = new LeafletModule.Map(mapContainer).setView([center.lat, center.lon], 12);

      // Leaflet default marker URLs need manual binding in Next.js.
      delete (LeafletModule.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
      LeafletModule.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      new LeafletModule.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (mapCoords) {
        markerRef.current = LeafletModule.marker([mapCoords.lat, mapCoords.lon]).addTo(map);
      }

      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        const clicked = { lat: event.latlng.lat, lon: event.latlng.lng };
        setMapCoords(clicked);
      });

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [mapOpen, currentCoords, mapCoords]);

  useEffect(() => {
    if (!mapCoords || !mapInstanceRef.current || !leafletRef.current) return;
    const map = mapInstanceRef.current;
    const Leaflet = leafletRef.current;
    if (markerRef.current) {
      markerRef.current.setLatLng([mapCoords.lat, mapCoords.lon]);
    } else {
      markerRef.current = Leaflet.marker([mapCoords.lat, mapCoords.lon]).addTo(map);
    }
    const zoom = map.getZoom();
    map.setView([mapCoords.lat, mapCoords.lon], zoom < 13 ? 13 : zoom);
  }, [mapCoords]);

  useEffect(() => {
    if (!mapOpen) return;
    const trimmed = mapSearchQuery.trim();
    if (trimmed.length < 2) {
      setMapSearchResults([]);
      setMapSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setMapSearchTouched(true);
        setMapSearchLoading(true);
        const [regionalResults, globalResults] = await Promise.all([
          countryCode ? fetchNominatim(trimmed, controller.signal, countryCode) : Promise.resolve([]),
          fetchNominatim(trimmed, controller.signal),
        ]);
        const ranked = rankResults(trimmed, [...regionalResults, ...globalResults]);
        setMapSearchResults(ranked);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setMapSearchResults([]);
      } finally {
        setMapSearchLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [mapOpen, mapSearchQuery, countryCode, currentCoords, locale, fetchNominatim, rankResults]);

  useEffect(() => {
    if (suppressNextLookupRef.current) {
      suppressNextLookupRef.current = false;
      setOptions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setOptions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const [regionalResults, globalResults] = await Promise.all([
          countryCode ? fetchNominatim(trimmed, controller.signal, countryCode) : Promise.resolve([]),
          fetchNominatim(trimmed, controller.signal),
        ]);
        const ranked = rankResults(trimmed, [...regionalResults, ...globalResults]);
        setOptions(ranked);
        if (document.activeElement === inputRef.current) {
          setOpen(true);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, locale, countryCode, currentCoords, fetchNominatim, rankResults]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const noResults = useMemo(
    () => query.trim().length >= 3 && !loading && open && options.length === 0,
    [query, loading, open, options.length]
  );

  const handleSelect = (option: LocationOption) => {
    suppressNextLookupRef.current = true;
    onChange(option.display_name);
    setQuery(option.display_name);
    setOpen(false);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t('location.unavailable'));
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setCurrentCoords({ lat: latitude, lon: longitude });
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'Accept-Language': locale,
              },
            }
          );

          if (!response.ok) {
            setError(t('location.geocodeFailed'));
            return;
          }

          const data = (await response.json()) as { display_name?: string };
          if (data?.display_name) {
            suppressNextLookupRef.current = true;
            onChange(data.display_name);
            setQuery(data.display_name);
            setOpen(false);
          } else {
            setError(t('location.geocodeFailed'));
          }
        } catch {
          setError(t('location.geocodeFailed'));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError(t('location.permissionDenied'));
        } else {
          setError(t('location.error'));
        }
      }
    );
  };

  const handleUseMapSelection = async () => {
    if (!mapCoords) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${mapCoords.lat}&lon=${mapCoords.lon}`,
        {
          headers: {
            'Accept-Language': locale,
          },
        }
      );
      if (!response.ok) {
        setError(t('location.geocodeFailed'));
        return;
      }
      const data = (await response.json()) as { display_name?: string };
      if (!data?.display_name) {
        setError(t('location.geocodeFailed'));
        return;
      }
      suppressNextLookupRef.current = true;
      onChange(data.display_name);
      setQuery(data.display_name);
      setMapOpen(false);
      setOpen(false);
    } catch {
      setError(t('location.geocodeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMapSearchSelect = (option: LocationOption) => {
    const lat = Number(option.lat);
    const lon = Number(option.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setMapCoords({ lat, lon });
    suppressNextLookupRef.current = true;
    onChange(option.display_name);
    setQuery(option.display_name);
    setMapSearchQuery(option.display_name);
    setMapSearchResults([]);
    setMapOpen(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative space-y-2', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
          }}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                setOpen(false);
              }
            }, 120);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={placeholder ?? t('location.searchPlaceholder')}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm',
            inputClassName
          )}
        />
        {allowCurrentLocation && (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMapOpen(true);
                setMapSearchQuery(query);
                setMapSearchResults([]);
                setMapSearchTouched(false);
              }}
              className={cn(
                'rounded-full border border-orange-200 bg-white p-1 text-orange-600 transition hover:bg-orange-50',
                buttonClassName
              )}
              aria-label={t('location.openMap')}
            >
              <MapPinned className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentLocation}
              className={cn(
                'rounded-full border border-orange-200 bg-white p-1 text-orange-600 transition hover:bg-orange-50',
                buttonClassName
              )}
              aria-label={t('location.useCurrent')}
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {locating && <p className="text-xs text-orange-600">{t('location.locating')}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {isMounted &&
        mapOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
            <div className="relative w-full max-w-3xl rounded-2xl border border-orange-100 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{t('location.mapTitle')}</p>
                <button
                  type="button"
                  onClick={() => setMapOpen(false)}
                  className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
                  aria-label={t('common.cancel')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-3 text-xs text-gray-600">{t('location.mapHint')}</p>
              <div className="relative z-[1200] mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={mapSearchQuery}
                  onChange={(event) => {
                    setMapSearchTouched(true);
                    setMapSearchQuery(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (mapSearchResults.length > 0) {
                        handleMapSearchSelect(mapSearchResults[0]);
                      }
                    }
                  }}
                  placeholder={t('location.mapSearchPlaceholder')}
                  className="h-10 w-full rounded-lg border border-orange-100 bg-orange-50/40 pl-9 pr-3 text-sm"
                />
                {mapSearchLoading && (
                  <p className="mt-1 text-xs text-gray-500">{t('location.loading')}</p>
                )}
                {!mapSearchLoading && mapSearchResults.length > 0 && (
                  <div className="absolute z-[1300] mt-1 w-full rounded-lg border border-orange-100 bg-white shadow-lg">
                    <ul className="max-h-48 overflow-auto">
                      {mapSearchResults.map((option) => (
                        <li key={`map-${option.lat}-${option.lon}`}>
                          <button
                            type="button"
                            onClick={() => handleMapSearchSelect(option)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-orange-50"
                          >
                            {option.display_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!mapSearchLoading &&
                  mapSearchTouched &&
                  mapSearchQuery.trim().length >= 2 &&
                  mapSearchResults.length === 0 && (
                    <div className="absolute z-[1300] mt-1 w-full rounded-lg border border-orange-100 bg-white px-3 py-2 text-xs text-gray-500 shadow-lg">
                      {t('location.noResults')}
                    </div>
                  )}
              </div>
              <div
                ref={mapContainerRef}
                className="relative z-[1000] h-80 w-full overflow-hidden rounded-lg border border-orange-100"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMapOpen(false)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUseMapSelection}
                  disabled={!mapCoords || loading}
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('location.useMapPin')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {open && (loading || options.length > 0 || noResults) && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-orange-100 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500">{t('location.loading')}</div>
          )}
          {!loading && options.length > 0 && (
            <ul className="max-h-56 overflow-auto">
              {options.map((option) => (
                <li key={`${option.lat}-${option.lon}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-orange-50"
                    onClick={() => handleSelect(option)}
                  >
                    {option.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {noResults && (
            <div className="px-3 py-2 text-xs text-gray-500">{t('location.noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
}
