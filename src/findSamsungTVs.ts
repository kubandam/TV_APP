// findSamsungTVs.ts
import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

const SSDP_ADDR = '239.255.255.250';
const SSDP_PORT = 1900;
const SEARCH_TARGET = 'urn:samsung.com:device:RemoteControlReceiver:1'; // or 'ssdp:all'

export type SamsungDiscovery = {
  ip: string;
  location?: string;
  raw: Record<string, string>;
};

export function findSamsungTVs(
  onResult: (tv: SamsungDiscovery) => void,
  onDone?: (list: SamsungDiscovery[]) => void,
  timeoutMs = 4000
) {
  const socket = dgram.createSocket({ type: 'udp4' });
  const msg = Buffer.from(
    `M-SEARCH * HTTP/1.1\r\n` +
      `HOST: ${SSDP_ADDR}:${SSDP_PORT}\r\n` +
      `MAN: "ssdp:discover"\r\n` +
      `MX: 2\r\n` +
      `ST: ${SEARCH_TARGET}\r\n\r\n`
  );

  const results: Record<string, SamsungDiscovery> = {};

  socket.on('message', (buf, rinfo) => {
    const text = buf.toString('utf8');
    if (!/samsung/i.test(text)) return;

    const headers: Record<string, string> = {};
    text.split('\r\n').forEach((line: string) => {
      const i = line.indexOf(':');
      if (i > -1) headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
    });

    const loc = headers['location'];
    const ipMatch = loc?.match(/https?:\/\/([^/:]+)/);
    const ip = ipMatch ? ipMatch[1] : rinfo.address;

    if (ip && !results[ip]) {
      const tv = { ip, location: loc, raw: headers };
      results[ip] = tv;
      onResult(tv);
    }
  });

  socket.bind(() => {
    // join multicast
    socket.addMembership(SSDP_ADDR);
    socket.send(msg, 0, msg.length, SSDP_PORT, SSDP_ADDR);
  });

  setTimeout(() => {
    socket.close();
    onDone?.(Object.values(results));
  }, timeoutMs);
}
