import { jsonResponse } from '@/lib/server/http';

type ZipCloudResult = {
  zipcode: string;
  address1: string;
  address2: string;
  address3: string;
  kana1: string;
  kana2: string;
  kana3: string;
};

type ZipCloudResponse = {
  message: string | null;
  results: ZipCloudResult[] | null;
  status: number;
};

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postalCode = (url.searchParams.get('postal_code') || '').replace(/[^\d]/g, '');
  if (postalCode.length !== 7) {
    return jsonResponse({ detail: 'postal_code must be 7 digits.' }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`, {
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return jsonResponse({ detail: 'Postal lookup failed.' }, 502);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return jsonResponse({ detail: 'Postal lookup failed.' }, 502);
  }

  const data = (await response.json().catch(() => null)) as ZipCloudResponse | null;
  const result = data?.results?.[0];
  if (!result) {
    return jsonResponse({ detail: data?.message || 'No address found for postal code.' }, 404);
  }

  return jsonResponse({
    postal_code: result.zipcode,
    prefecture: result.address1,
    city: result.address2,
    town: result.address3,
    address: `${result.address1}${result.address2}${result.address3}`,
    kana: `${result.kana1}${result.kana2}${result.kana3}`,
  });
}
