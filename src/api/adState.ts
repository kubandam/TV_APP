import { API_BASE_URL, API_KEY, DEVICE_ID } from '../config/api';

export type AdState = {
  device_id: string;
  ad_active: boolean;
  ad_since: string | null;
  last_result_id: number;
  updated_at: string | null;
};

export type AdResult = {
  id: number;
  is_ad: boolean;
  confidence: number | null;
  captured_at: string | null;
  created_at: string;
  payload: any;
};

export async function fetchAdState(): Promise<AdState> {
  const url = `${API_BASE_URL}/v1/ad-state`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'X-API-Key': API_KEY,
      'X-Device-Id': DEVICE_ID,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => 'Unknown error');
    throw new Error(`fetchAdState failed: ${res.status} ${res.statusText} - ${txt}`);
  }

  return await res.json();
}

export async function fetchAdResults(limit: number = 100): Promise<AdResult[]> {
  const url = `${API_BASE_URL}/v1/ad-results?limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'X-API-Key': API_KEY,
      'X-Device-Id': DEVICE_ID,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => 'Unknown error');
    throw new Error(`fetchAdResults failed: ${res.status} ${res.statusText} - ${txt}`);
  }

  return await res.json();
}


