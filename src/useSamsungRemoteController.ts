import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, NativeEventEmitter, NativeModule, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSecureAndPair } from '../src/samsungSecure';
import { encode as b64 } from 'base-64';

// ---------- Types ----------
export type ReadyState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
export type RemoteKey =
  | 'KEY_VOLUP' | 'KEY_VOLDOWN' | 'KEY_MUTE'
  | 'KEY_0' | 'KEY_1' | 'KEY_2' | 'KEY_3' | 'KEY_4' | 'KEY_5' | 'KEY_6' | 'KEY_7' | 'KEY_8' | 'KEY_9'
  | 'KEY_ENTER';

type SamsungWsNative = {
  connect: (url: string, host: string) => Promise<void>;
  send: (text: string) => void;
  disconnect: () => void;
};

const Native = NativeModules as { SamsungWs?: SamsungWsNative };
const emitter = Native.SamsungWs
  ? new NativeEventEmitter(Native.SamsungWs as unknown as NativeModule)
  : undefined;

// Storage keys
const STORAGE_KEYS = {
  CONNECTED_TV_IP: 'samsung_connected_tv_ip',
  CONNECTED_TV_NAME: 'samsung_connected_tv_name',
  CONNECTED_TV_TOKEN: 'samsung_connected_tv_token',
} as const;

// ---------- base64 fallback (unchanged) ----------
let b64encode: ((s: string) => string) | undefined = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  b64encode = require('base-64').encode;
} catch { /* noop */ }

const toBase64 = (s: string) => {
  if (b64encode) return b64encode(s);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = s, output = '';
  for (let block = 0, charCode: number, i = 0, map = chars;
       str.charAt(i | 0) || ((map = '='), i % 1);
       output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) throw new Error('Non-ASCII in app name; install base-64 pkg');
    block = (block << 8) | charCode;
  }
  return output;
};

// ---------- Controller (hook) ----------
export function useSamsungRemoteController(persistent = false) {
  const [ip, setIp] = useState<string>('');
  const [status, setStatus] = useState<ReadyState>('DISCONNECTED');
  const [log, setLog] = useState<string>('');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isInsecureMode, setIsInsecureMode] = useState<boolean>(false);
  const [connectedTvName, setConnectedTvName] = useState<string>('');

  const heartbeatRef = useRef<number | null>(null);
  const subsRef = useRef<{ remove: () => void }[]>([]);
  const isInitializedRef = useRef(false);

  // Load saved connection data on mount (no auto-connect)
  useEffect(() => {
    const loadSavedConnection = async () => {
      try {
        const [savedIp, savedName, savedToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_IP),
          AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_TOKEN),
        ]);

        if (savedIp) {
          setIp(savedIp);
          setConnectedTvName(savedName || '');
          if (savedToken) setToken(savedToken);
        }
      } catch (error) {
        appendLog(`Failed to load saved connection: ${error}`);
      }
    };

    loadSavedConnection();
  }, []);

  // load token on ip change
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem(`samsung_token_${ip}`);
      if (t) setToken(t);
    })();
  }, [ip]);

  const appendLog = useCallback((line: string) => {
    setLog(prev => `${prev}\n${line}`);
    // parity with component: keep console output
    // eslint-disable-next-line no-console
    console.log(line);
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      try {
        Native.SamsungWs?.send(
          JSON.stringify({ method: 'ms.channel.emit', params: { event: 'ping' } }),
        );
      } catch { /* ignore */ }
    }, 25000) as unknown as number; // unchanged
  }, [clearHeartbeat]);

  const makeSecureUrl = useCallback((ipAddr: string, tok?: string) => {
    const name = encodeURIComponent(toBase64('RN Remote'));
    const t = tok ? `&token=${encodeURIComponent(tok)}` : '';
    return `wss://${ipAddr}:8002/api/v2/channels/samsung.remote.control?name=${name}${t}`;
  }, []);

  const makeInsecureUrl = useCallback((ipAddr: string) => {
    const name = encodeURIComponent(toBase64('RN Remote'));
    return `ws://${ipAddr}:8001/api/v2/channels/samsung.remote.control?name=${name}`;
  }, []);

  const detachListeners = useCallback(() => {
    subsRef.current.forEach(s => {
      try { s.remove(); } catch { /* ignore */ }
    });
    subsRef.current = [];
  }, []);

  const attachListeners = useCallback(() => {
    if (!emitter) return;
    detachListeners();

    const onOpen = emitter.addListener('SamsungWs_open', () => {
      appendLog(isInsecureMode ? 'Insecure socket open.' : 'Secure socket open.');
    });

    const onMessage = emitter.addListener('SamsungWs_message', async (text: string) => {
      try {
        const msg = JSON.parse(String(text));
        if (msg?.event) appendLog(`Event: ${msg.event}`);
        if (msg?.event === 'ms.channel.connect' && msg?.data?.token) {
          const t = String(msg.data.token);
          await AsyncStorage.setItem(`samsung_token_${ip}`, t);
          await AsyncStorage.setItem(STORAGE_KEYS.CONNECTED_TV_TOKEN, t);
          setToken(t);
          appendLog(`Token saved: ${t}`);
        }
      } catch { /* ignore non-JSON */ }
    });

    const onClosed = emitter.addListener('SamsungWs_closed', (evt: any) => {
      clearHeartbeat();
      setStatus('DISCONNECTED');
      appendLog(`Disconnected (${evt?.code ?? '?'}).`);
    });

    const onError = emitter.addListener('SamsungWs_error', (err: string) => {
      clearHeartbeat();
      setStatus('ERROR');
      appendLog(`WS error: ${err || 'unknown'}`);
    });

    subsRef.current = [onOpen, onMessage, onClosed, onError];
  }, [appendLog, clearHeartbeat, detachListeners, ip, isInsecureMode]);

  const ensureToken = useCallback(async (): Promise<string> => {
    const key = `samsung_token_${ip}`;
    let t = await AsyncStorage.getItem(key);
    if (!t) {
      if (!emitter || !Native.SamsungWs) throw new Error('SamsungWs native module not available');
      const appNameB64 = encodeURIComponent(b64('RN Remote'));
      appendLog('Pairing over secure native socket… accept the popup on TV.');
      t = await connectSecureAndPair(ip, appNameB64);
      await AsyncStorage.setItem(key, t);
      appendLog(`Paired. Token stored.`);
    }
    setToken(t);
    return t;
  }, [ip, appendLog]);

  const connect = useCallback(async (ip_?: string) => {
    if (ip_) setIp(ip_);
    if (!Native.SamsungWs || !emitter) {
      Alert.alert('Missing native module', 'SamsungWs native module is not available.');
      return;
    }

    try {
      setStatus('CONNECTING');
      setIsInsecureMode(false);
      appendLog(`Connecting to ${ip} (secure)…`);
      attachListeners();

      const t = await ensureToken();
      const url = makeSecureUrl(ip, t);
      await Native.SamsungWs.connect(url, ip);

      startHeartbeat();
      setStatus('CONNECTED');
      appendLog('Connected via wss:8002 using native bridge.');
    } catch (e: any) {
      appendLog(`Secure connect failed (${String(e?.message || e)}). Trying insecure ws:8001…`);
      try {
        setIsInsecureMode(true);
        // No token required on insecure channel
        const url = makeInsecureUrl(ip);
        await Native.SamsungWs.connect(url, ip);
        startHeartbeat();
        setStatus('CONNECTED');
        appendLog('Connected via ws:8001 (insecure fallback).');
        // Do not alert here; success case.
      } catch (e2: any) {
        setStatus('ERROR');
        appendLog(`Insecure connect failed: ${String(e2?.message || e2)}`);
        Alert.alert('Connection failed', `Secure and insecure connection attempts failed.\nSecure: ${String(e?.message || e)}\nInsecure: ${String(e2?.message || e2)}`);
      }
    }
  }, [ip, attachListeners, ensureToken, makeSecureUrl, makeInsecureUrl, startHeartbeat, appendLog]);

  const disconnect = useCallback(() => {
    clearHeartbeat();
    try { Native.SamsungWs?.disconnect(); } catch { /* ignore */ }
    setStatus('DISCONNECTED');
    appendLog('Disconnected by user.');
    detachListeners();
  }, [appendLog, clearHeartbeat, detachListeners]);

  const sendKey = useCallback((key: RemoteKey) => {
    if (status !== 'CONNECTED') {
      Alert.alert('Not connected', 'Connect to the TV first.');
      return;
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
      Native.SamsungWs?.send(JSON.stringify(payload));
      appendLog(`Sent ${key}`);
    } catch (e) {
      appendLog(`Send failed: ${String((e as any)?.message || e)}`);
    }
  }, [status, appendLog]);

  // New functions for persistent connection management
  const saveConnectedTV = useCallback(async (tvIp: string, tvName?: string) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.CONNECTED_TV_IP, tvIp),
        AsyncStorage.setItem(STORAGE_KEYS.CONNECTED_TV_NAME, tvName || ''),
      ]);
      setIp(tvIp);
      setConnectedTvName(tvName || '');
      appendLog(`Saved TV connection: ${tvIp}${tvName ? ` (${tvName})` : ''}`);
    } catch (error) {
      appendLog(`Failed to save TV connection: ${error}`);
    }
  }, [appendLog]);

  const clearSavedTV = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.CONNECTED_TV_IP),
        AsyncStorage.removeItem(STORAGE_KEYS.CONNECTED_TV_NAME),
        AsyncStorage.removeItem(STORAGE_KEYS.CONNECTED_TV_TOKEN),
      ]);
      setConnectedTvName('');
      appendLog('Cleared saved TV connection');
    } catch (error) {
      appendLog(`Failed to clear saved TV connection: ${error}`);
    }
  }, [appendLog]);


  const getSavedTVInfo = useCallback(async () => {
    try {
      const [savedIp, savedName] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_IP),
        AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_NAME),
      ]);
      return { ip: savedIp, name: savedName };
    } catch (error) {
      appendLog(`Failed to get saved TV info: ${error}`);
      return { ip: null, name: null };
    }
  }, [appendLog]);

  // convenience functions
  const volumeUp = useCallback(() => sendKey('KEY_VOLUP'), [sendKey]);
  const volumeDown = useCallback(() => sendKey('KEY_VOLDOWN'), [sendKey]);
  const mute = useCallback(() => sendKey('KEY_MUTE'), [sendKey]);

  // cleanup on unmount - only disconnect if not persistent
  useEffect(() => () => {
    clearHeartbeat();
    detachListeners();
    if (!persistent) {
      try { Native.SamsungWs?.disconnect(); } catch {}
    }
  }, [detachListeners, clearHeartbeat, persistent]);

  return {
    // state
    ip, setIp,
    status, log,
    connectedTvName,

    // commands
    connect, disconnect, sendKey,

    // persistent connection management
    saveConnectedTV,
    clearSavedTV,
    getSavedTVInfo,

    // convenience
    volumeUp, volumeDown, mute,
    isInsecure: isInsecureMode,
    isConnected: status === 'CONNECTED',
    getToken: () => token,
  };
}
