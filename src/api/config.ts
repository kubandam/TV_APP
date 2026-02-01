import { API_BASE_URL, API_KEY, DEVICE_ID } from '../config/api';

export type DeviceConfig = {
  device_id: string;
  fallback_channel: number | null;
  original_channel: number | null;
  auto_switch_enabled: boolean;
  updated_at: string | null;
};

/**
 * Get device configuration from API
 */
export async function getDeviceConfig(): Promise<DeviceConfig> {
  const url = `${API_BASE_URL}/v1/config`;
  const response = await fetch(url, {
    headers: {
      'X-API-Key': API_KEY,
      'X-Device-Id': DEVICE_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get config: ${response.status}`);
  }

  return response.json();
}

/**
 * Update device configuration (fallback_channel, auto_switch_enabled)
 */
export async function updateDeviceConfig(config: {
  fallback_channel?: number;
  auto_switch_enabled?: boolean;
}): Promise<DeviceConfig> {
  const url = `${API_BASE_URL}/v1/config`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Device-Id': DEVICE_ID,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to update config: ${response.status}`);
  }

  return response.json();
}

/**
 * Report current channel to API (sets original_channel for return after ads)
 * Call this whenever user manually switches channel
 */
export async function reportCurrentChannel(channel: number): Promise<void> {
  const url = `${API_BASE_URL}/v1/config/current-channel?channel=${channel}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'X-Device-Id': DEVICE_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to report current channel: ${response.status}`);
  }
}
