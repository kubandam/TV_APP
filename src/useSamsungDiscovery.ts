
import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

const SSDP_ADDR = '239.255.255.250';
const SSDP_PORT = 1900;
// Limiting ST narrows noise but still finds Samsung
const SEARCH_TARGET = 'urn:schemas-upnp-org:device:MediaRenderer:1';

export type SamsungDiscovery = {
  ip: string;
  name?: string;        // <friendlyName> from device description
  model?: string;       // <modelName>
  location?: string;    // UPnP description URL
  raw: Record<string, string>;
  isConnected?: boolean;
};

const parseHeaders = (text: string) => {
  const headers: Record<string, string> = {};
  text.split('\r\n').forEach((line: string) => {
    const i = line.indexOf(':');
    if (i > -1) headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  });
  return headers;
};

const pickIpFromLocation = (loc?: string, fallback?: string) => {
  const ipMatch = loc?.match(/https?:\/\/([^/:]+)/);
  return ipMatch ? ipMatch[1] : fallback;
};

const grabTag = (xml: string, tag: string) => {
  const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i'));
  return m?.[1]?.trim();
};

/** Fetch device description XML at LOCATION and read friendlyName/modelName */
async function enrichFromLocation(tv: SamsungDiscovery): Promise<SamsungDiscovery> {
  if (!tv.location) return tv;
  try {
    const resp = await fetch(tv.location);
    const xml = await resp.text();
    const name = grabTag(xml, 'friendlyName') || tv.name;
    const model = grabTag(xml, 'modelName') || tv.model;
    return { ...tv, name, model };
  } catch {
    return tv;
  }
}

/** Very small fallback: try a few common subnets for :8001 WS */
async function fallbackIPScan(): Promise<string | null> {
  const bases = ['192.168.1.', '192.168.0.', '10.0.0.'];
  const lastOctets = [2, 10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 150, 180, 200]; // quick probe
  for (const base of bases) {
    for (const n of lastOctets) {
      const ip = `${base}${n}`;
      const url =
        `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=` +
        Buffer.from('AutoScanApp').toString('base64');
      try {
        const ws = new WebSocket(url);
        const ok = await new Promise<boolean>(resolve => {
          let done = false;
          const finish = (v: boolean) => { if (!done) { done = true; resolve(v); ws.close(); } };
          ws.onopen = () => finish(true);
          ws.onerror = () => finish(false);
          setTimeout(() => finish(false), 900);
        });
        if (ok) return ip;
      } catch { /* ignore */ }
    }
  }
  return null;
}

export function findSamsungTVs(
  onResult: (tv: SamsungDiscovery) => void,
  onDone?: (list: SamsungDiscovery[]) => void,
  timeoutMs = 5000,
) {
  const socket = dgram.createSocket({ type: 'udp4' });
  const msg = Buffer.from(
    `M-SEARCH * HTTP/1.1\r\n` +
      `HOST: ${SSDP_ADDR}:${SSDP_PORT}\r\n` +
      `MAN: "ssdp:discover"\r\n` +
      `MX: 2\r\n` +
      `ST: ${SEARCH_TARGET}\r\n\r\n`,
  );

  const results: Record<string, SamsungDiscovery> = {};
  let anythingHeard = false;

  socket.on('message', async (buf, rinfo) => {
    anythingHeard = true;
    const text = buf.toString('utf8');
    const headers = parseHeaders(text);
    const loc = headers['location'];
    const ip = pickIpFromLocation(loc, rinfo.address);
    if (!ip || results[ip]) return;

    // Quick gate: Samsung usually appears in SERVER/USN/LOCATION chains
    const rawStr = `${headers.server || ''} ${headers.usn || ''} ${loc || ''}`.toLowerCase();
    if (!/samsung|tv|smarttv/.test(rawStr)) return;

    // Initial record
    let tv: SamsungDiscovery = { ip, location: loc, raw: headers };

    // Try to read friendly name/model from device description
    tv = await enrichFromLocation(tv);

    results[ip] = tv;
    onResult(tv);
  });

  socket.bind(() => {
    try {
      socket.addMembership(SSDP_ADDR);
    } catch {}
    socket.send(msg, 0, msg.length, SSDP_PORT, SSDP_ADDR);
  });

  const finish = async () => {
    try { socket.close(); } catch {}
    if (!Object.keys(results).length && !anythingHeard) {
      // No SSDP at all → quick WS probe on common IPs
      const ip = await fallbackIPScan();
      if (ip) {
        const tv = { ip, raw: {}, location: undefined };
        results[ip] = tv;
        onResult(tv);
      }
    }
    onDone?.(Object.values(results));
  };

  setTimeout(finish, timeoutMs);
}
