import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, NativeEventEmitter, NativeModule } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSecureAndPair } from '../src/samsungSecure';
import { encode as b64 } from 'base-64';

// ---------- Types ----------
type ReadyState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
type RemoteKey = 'KEY_VOLUP' | 'KEY_VOLDOWN' | 'KEY_MUTE' | (string & {});

type SamsungWsNative = {
  connect: (url: string, host: string) => Promise<void>;
  send: (text: string) => void;
  disconnect: () => void;
};

type Options = {
  /** Called for each log line (in addition to internal `log` state). */
  onLog?: (line: string) => void;
  /** Called whenever status changes. */
  onStatusChange?: (status: ReadyState) => void;
};

const Native = NativeModules as { SamsungWs?: SamsungWsNative };
const emitter = Native.SamsungWs
  ? new NativeEventEmitter(Native.SamsungWs as unknown as NativeModule)
  : undefined;

// ---------- base64 fallback (unchanged logic) ----------
let b64encode: ((s: string) => string) | undefined = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  b64encode = require('base-64').encode;
} catch {
  /* noop */
}
const toBase64 = (s: string) => {
  if (b64encode) return b64encode(s);
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = s,
    output = '';
  for (
    let block = 0, charCode: number, i = 0, map = chars;
    str.charAt(i | 0) || ((map = '='), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff)
      throw new Error('Non-ASCII in app name; install base-64 pkg');
    block = (block << 8) | charCode;
  }
  return output;
};

// -- helpers (place near the top, after toBase64) --
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const digitToKey = (d: string): RemoteKey => `KEY_${d}` as RemoteKey;

async function sendKeysSequential(
  sendKeyFn: (k: RemoteKey) => void,
  keys: RemoteKey[],
  gapMs = 120,
) {
  for (const k of keys) {
    sendKeyFn(k);
    await sleep(gapMs);
  }
}

// ---------- Hook ----------
export function useSamsungRemoteController(
  initialIp = '192.168.1.62',
  opts?: Options,
) {
  const [ip, setIp] = useState(initialIp);
  const [status, setStatus] = useState<ReadyState>('DISCONNECTED');
  const [log, setLog] = useState<string>('');
  const [token, setToken] = useState<string | undefined>(undefined);

  const heartbeatRef = useRef<number | null>(null);
  const subsRef = useRef<{ remove: () => void }[]>([]);

  const testTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTestTimers = () => {
    testTimersRef.current.forEach(clearTimeout);
    testTimersRef.current = [];
  };
  const stayConnectedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000); // ms
  const MAX_BACKOFF = 15000;
  
  // Use refs to break circular dependencies
  const _connectInternalRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);
  const scheduleReconnectRef = useRef<((why: string) => void) | null>(null);
  // Load token for current IP on mount / ip change (same as your effect)
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem(`samsung_token_${ip}`);
      if (t) setToken(t);
    })();
  }, [ip]);

  const appendLog = useCallback(
    (line: string) => {
      setLog(prev => `${prev}\n${line}`);
      if (opts?.onLog) opts.onLog(line);
      // keep console output for parity with original
      // eslint-disable-next-line no-console
      console.log(line);
    },
    [opts],
  );

  const setStatusSafe = useCallback(
    (s: ReadyState) => {
      setStatus(s);
      opts?.onStatusChange?.(s);
    },
    [opts],
  );

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    // Temporarily disable heartbeat to debug connection stability
    // heartbeatRef.current = setInterval(() => {
    //   try {
    //     Native.SamsungWs?.send(
    //       JSON.stringify({
    //         method: 'ms.channel.emit',
    //         params: { event: 'ping' },
    //       }),
    //     );
    //   } catch {}
    // }, 25000) as unknown as number;
    appendLog('Heartbeat disabled for debugging');
  }, [clearHeartbeat, appendLog]);

  const makeSecureUrl = useCallback((ipAddr: string, tok?: string) => {
    const name = encodeURIComponent(toBase64('RN Remote'));
    const t = tok ? `&token=${encodeURIComponent(tok)}` : '';
    return `wss://${ipAddr}:8002/api/v2/channels/samsung.remote.control?name=${name}${t}`;
  }, []);

  const detachListeners = useCallback(() => {
    subsRef.current.forEach(s => {
      try {
        s.remove();
      } catch {
        /* ignore */
      }
    });
    subsRef.current = [];
  }, []);

  const ensureToken = useCallback(async (): Promise<string> => {
    const key = `samsung_token_${ip}`;
    let t = await AsyncStorage.getItem(key);
    if (!t) {
      if (!emitter || !Native.SamsungWs)
        throw new Error('SamsungWs native module not available');
      const appNameB64 = encodeURIComponent(b64('RN Remote'));
      appendLog('Pairing over secure native socket… accept the popup on TV.');
      t = await connectSecureAndPair(ip, appNameB64);
      await AsyncStorage.setItem(key, t);
      appendLog(`Paired. Token stored.`);
    }
    setToken(t);
    return t;
  }, [ip, appendLog]);

  // useSamsungRemoteController.ts
  const sendKey = useCallback(
    (key: RemoteKey) => {
      if (status !== 'CONNECTED') {
        const err = new Error('Not connected. Call connect() first.');
        appendLog(err.message);
        throw err;
      }
      const payload = {
        method: 'ms.remote.control',
        params: {
          Cmd: 'Click',
          DataOfCmd: key,
          Option: 'false',
          TypeOfRemote: 'SendRemoteKey',
        },
      };
      try {
        const payloadStr = JSON.stringify(payload);
        Native.SamsungWs?.send(payloadStr);
        appendLog(`Sent ${key}: ${payloadStr}`);
      } catch (e: any) {
        const msg = `Send failed: ${String(e?.message || e)}`;
        appendLog(msg);
        throw new Error(msg);
      }
    },
    [status, appendLog],
  );

  const volumeUp = useCallback(() => sendKey('KEY_VOLUP'), [sendKey]);
  const volumeDown = useCallback(() => sendKey('KEY_VOLDOWN'), [sendKey]);
  const mute = useCallback(() => sendKey('KEY_MUTE'), [sendKey]);

  // Cleanup on unmount (parity with original)
  useEffect(
    () => () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      clearHeartbeat();
      detachListeners();
      try {
        Native.SamsungWs?.disconnect();
      } catch {}
    },
    [detachListeners, clearHeartbeat],
  );

  // change channel by step
  const channelUp = useCallback(() => sendKey('KEY_CHUP'), [sendKey]);
  const channelDown = useCallback(() => sendKey('KEY_CHDOWN'), [sendKey]);

  // tune to a specific TV channel number
  const tuneChannel = useCallback(
    async (
      tvNumber: number | string,
      opts?: { enter?: boolean; gapMs?: number },
    ) => {
      // if (status !== 'CONNECTED')
      //   throw new Error('Not connected. Call connect() first.');
      const digits = String(tvNumber).replace(/\D/g, '');
      if (!digits) throw new Error('Invalid channel number');
      console.log('tvNumber', tvNumber);

      appendLog(`Tuning to channel ${digits}…`);
      await sendKeysSequential(
        sendKey,
        digits.split('').map(digitToKey),
        opts?.gapMs ?? 120,
      );
      if (opts?.enter !== false) {
        await sleep(100);
        sendKey('KEY_ENTER');
      }
      appendLog(`Channel ${digits} sent.`);
    },
    [status, sendKey, appendLog],
  );

  // alias
  const sendChannel = tuneChannel;

  // 10s → first, +10s → second, +10s → original
  const runChannelTest = useCallback(
    (first: number, second: number, original?: number, stepDelayMs = 10000) => {
      if (status !== 'CONNECTED')
        throw new Error('Not connected. Call connect() first.');
      clearTestTimers();
      appendLog(
        `Test start: [orig=${
          original ?? 'unknown'
        }] -> ${first} -> ${second} -> back`,
      );

      testTimersRef.current.push(
        setTimeout(() => {
          tuneChannel(first).catch(e =>
            appendLog(`Test step1 error: ${String(e)}`),
          );
        }, stepDelayMs),
      );

      testTimersRef.current.push(
        setTimeout(() => {
          tuneChannel(second).catch(e =>
            appendLog(`Test step2 error: ${String(e)}`),
          );
        }, stepDelayMs * 2),
      );

      testTimersRef.current.push(
        setTimeout(() => {
          if (original != null) {
            tuneChannel(original).catch(e =>
              appendLog(`Test step3 error: ${String(e)}`),
            );
          } else {
            appendLog(
              'Test: original channel not provided — skipping return step.',
            );
          }
        }, stepDelayMs * 3),
      );
    },
    [status, tuneChannel, appendLog],
  );

  const cancelChannelTest = useCallback(() => {
    clearTestTimers();
    appendLog('Test cancelled.');
  }, [appendLog]);

  useEffect(
    () => () => {
      clearTestTimers();
      clearHeartbeat();
      detachListeners();
      try {
        Native.SamsungWs?.disconnect();
      } catch {}
    },
    [detachListeners],
  );

  const scheduleReconnect = useCallback(
    (why: string) => {
      if (!stayConnectedRef.current) return;
      if (status === 'CONNECTING') return;
      if (reconnectTimerRef.current) return;

      const delay = backoffRef.current;
      appendLog(`Reconnecting in ${delay} ms (${why})…`);
      reconnectTimerRef.current = setTimeout(async () => {
        reconnectTimerRef.current = null;
        try {
          await _connectInternalRef.current?.(true);
          backoffRef.current = 1000; // reset on success
        } catch {
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
          scheduleReconnectRef.current?.('retry');
        }
      }, delay);
    },
    [status, appendLog],
  );

  const attachListeners = useCallback(() => {
    if (!emitter) return;
    detachListeners();

    const onOpen = emitter.addListener('SamsungWs_open', () => {
      appendLog('Secure socket open.');
      backoffRef.current = 1000;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    });
    const onMessage = emitter.addListener(
      'SamsungWs_message',
      async (text: string) => {
        try {
          const msg = JSON.parse(String(text));
          if (msg?.event) appendLog(`Event: ${msg.event}`);
          if (msg?.event === 'ms.channel.connect' && msg?.data?.token) {
            const t = String(msg.data.token);
            await AsyncStorage.setItem(`samsung_token_${ip}`, t);
            setToken(t);
            appendLog(`Token saved: ${t}`);
          }
          // Log all messages for debugging
          appendLog(`Received: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        } catch {
          // Log non-JSON messages too
          appendLog(`Received non-JSON: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        }
      },
    );

    const onClosed = emitter.addListener('SamsungWs_closed', (evt: any) => {
      clearHeartbeat();
      setStatus('DISCONNECTED');
      appendLog(`Disconnected (${evt?.code ?? '?'}) - reason: ${evt?.reason || 'unknown'}, wasClean: ${evt?.wasClean || 'unknown'}`);
      // Temporarily disable auto-reconnect to debug
      // scheduleReconnectRef.current?.('closed');
    });
    const onError = emitter.addListener('SamsungWs_error', (err: string) => {
      clearHeartbeat();
      setStatus('ERROR');
      appendLog(`WS error: ${err || 'unknown'}`);
      // Temporarily disable auto-reconnect to debug
      // scheduleReconnectRef.current?.('error');
    });

    subsRef.current = [onOpen, onMessage, onClosed, onError];
  }, [appendLog, clearHeartbeat, detachListeners, ip]);

  const _connectInternal = useCallback(
    async (silent = false) => {
      if (!Native.SamsungWs || !emitter)
        throw new Error('SamsungWs native module is not available.');
      if (status === 'CONNECTED' || status === 'CONNECTING') return;

      setStatusSafe('CONNECTING');
      if (!silent) appendLog(`Connecting to ${ip} (secure)…`);
      attachListeners();

      const t = await ensureToken();
      const url = makeSecureUrl(ip, t);
      await Native.SamsungWs.connect(url, ip);

      startHeartbeat();
      setStatusSafe('CONNECTED');
      if (!silent) appendLog('Connected via wss:8002 using native bridge.');
    },
    [
      status,
      ip,
      attachListeners,
      ensureToken,
      makeSecureUrl,
      startHeartbeat,
      setStatusSafe,
      appendLog,
    ],
  );

  // Store refs to break circular dependencies
  _connectInternalRef.current = _connectInternal;
  scheduleReconnectRef.current = scheduleReconnect;

  const connect = useCallback(async () => {
    stayConnectedRef.current = true;
    backoffRef.current = 1000;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    await _connectInternal();
  }, [_connectInternal]);

  const disconnect = useCallback(() => {
    stayConnectedRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    clearTestTimers?.(); // if you added tests
    clearHeartbeat();
    try {
      Native.SamsungWs?.disconnect();
    } catch {}
    setStatusSafe('DISCONNECTED');
    appendLog('Disconnected by user.');
    detachListeners();
  }, [appendLog, clearHeartbeat, detachListeners, setStatusSafe]);

  return {
    // state{
    ip,
    setIp,
    status,
    log,
    connect,
    disconnect,
    sendKey,
    volumeUp,
    volumeDown,
    mute,

    // NEW:
    channelUp,
    channelDown,
    tuneChannel,
    sendChannel,
    runChannelTest,
    cancelChannelTest,

    isConnected: status === 'CONNECTED',
    getToken: () => token,
  };
}
