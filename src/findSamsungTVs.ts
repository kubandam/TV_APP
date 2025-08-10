import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

const SSDP_ADDR = '239.255.255.250';
const SSDP_PORT = 1900;
const SEARCH_TARGET = 'ssdp:all';

export type SamsungDiscovery = {
  ip: string;
  location?: string;
  raw: Record<string, string>;
};

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
  let foundViaSSDP = false;

  socket.on('message', (buf, rinfo) => {
    const text = buf.toString('utf8');
    console.log('[SSDP]', rinfo.address, text);

    if (!/samsung|smarttv|tv|remote/i.test(text)) return;

    const headers: Record<string, string> = {};
    text.split('\r\n').forEach((line: string) => {
      const i = line.indexOf(':');
      if (i > -1)
        headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
    });

    const loc = headers['location'];
    const ipMatch = loc?.match(/https?:\/\/([^/:]+)/);
    const ip = ipMatch ? ipMatch[1] : rinfo.address;

    if (ip && !results[ip]) {
      const tv = { ip, location: loc, raw: headers };
      results[ip] = tv;
      foundViaSSDP = true;
      onResult(tv);
    }
  });

  socket.bind(() => {
    socket.addMembership(SSDP_ADDR);
    socket.send(msg, 0, msg.length, SSDP_PORT, SSDP_ADDR);
  });

  setTimeout(async () => {
    socket.close();

    if (!foundViaSSDP) {
      console.log('[Fallback] Spúšťam WebSocket overenie IP rozsahu...');
      const fallback = await fallbackIPScan();
      if (fallback) {
        const tv = { ip: fallback, raw: {}, location: undefined };
        onResult(tv);
        onDone?.([tv]);
        return;
      }
    }

    onDone?.(Object.values(results));
  }, timeoutMs);
}

async function fallbackIPScan(): Promise<string | null> {
  const base = '192.168.0.';
  for (let i = 1; i <= 254; i++) {
    const ip = `${base}107`;
    const url =
      `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=` +
      Buffer.from('AutoScanApp').toString('base64');

    try {
      const ws = new WebSocket(url);
      const result = await new Promise<boolean>(resolve => {
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 1000);
      });

      if (result) {
        console.log('[Fallback] Našiel som TV na IP:', ip);
        return ip;
      }
    } catch {}
  }

  return null;
}
