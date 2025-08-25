import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  NativeModules,
  NativeEventEmitter,
  Platform,
  NativeModule,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { textStyles } from './theme/fonts';
import { connectSecureAndPair } from '../src/samsungSecure';
import { encode as b64 } from 'base-64';

let b64encode: ((s: string) => string) | undefined = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  b64encode = require('base-64').encode;
} catch {
  /* noop */
}

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

type ReadyState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

type SamsungWsNative = {
  connect: (url: string, host: string) => Promise<void>;
  send: (text: string) => void;
  disconnect: () => void;
};

const Native = NativeModules as { SamsungWs?: SamsungWsNative };
const emitter = Native.SamsungWs ? new NativeEventEmitter(Native.SamsungWs as unknown as NativeModule) : undefined;

export default function VolumeRemote() {
  const [ip, setIp] = useState('192.168.1.62');
  const [status, setStatus] = useState<ReadyState>('DISCONNECTED');
  const [log, setLog] = useState<string>('');
  const [token, setToken] = useState<string | undefined>(undefined);
  const heartbeatRef = useRef<number | null>(null);
  const subsRef = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem(`samsung_token_${ip}`);
      if (t) setToken(t);
    })();
  }, [ip]);

  const appendLog = useCallback((line: string) => {
    setLog(prev => `${prev}\n${line}`);
    console.log(line);
  }, []);

  const clearHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      try {
        Native.SamsungWs?.send(
          JSON.stringify({ method: 'ms.channel.emit', params: { event: 'ping' } }),
        );
      } catch { /* ignore */ }
    }, 25000) as unknown as number;
  };

  const makeSecureUrl = (ipAddr: string, tok?: string) => {
    const name = encodeURIComponent(toBase64('RN Remote'));
    const t = tok ? `&token=${encodeURIComponent(tok)}` : '';
    return `wss://${ipAddr}:8002/api/v2/channels/samsung.remote.control?name=${name}${t}`;
  };

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
      appendLog('Secure socket open.');
    });
    const onMessage = emitter.addListener('SamsungWs_message', async (text: string) => {
      try {
        const msg = JSON.parse(String(text));
        if (msg?.event) appendLog(`Event: ${msg.event}`);
        if (msg?.event === 'ms.channel.connect' && msg?.data?.token) {
          const t = String(msg.data.token);
          await AsyncStorage.setItem(`samsung_token_${ip}`, t);
          setToken(t);
          appendLog(`Token saved: ${t}`);
        }
      } catch {
        // ignore non-JSON packets
      }
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
  }, [appendLog, detachListeners, ip]);

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

  const connect = useCallback(async () => {
    if (!Native.SamsungWs || !emitter) {
      Alert.alert('Missing native module', 'SamsungWs native module is not available.');
      return;
    }

    try {
      setStatus('CONNECTING');
      appendLog(`Connecting to ${ip} (secure)…`);
      attachListeners();

      const t = await ensureToken();
      const url = makeSecureUrl(ip, t);
      await Native.SamsungWs.connect(url, ip);

      startHeartbeat();
      setStatus('CONNECTED');
      appendLog('Connected via wss:8002 using native bridge.');
    } catch (e: any) {
      setStatus('ERROR');
      appendLog(`Connect failed: ${String(e?.message || e)}`);
      Alert.alert('Connection failed', String(e?.message || e));
    }
  }, [ip, attachListeners, ensureToken, appendLog]);

  const disconnect = useCallback(() => {
    clearHeartbeat();
    try { Native.SamsungWs?.disconnect(); } catch { /* ignore */ }
    setStatus('DISCONNECTED');
    appendLog('Disconnected by user.');
    detachListeners();
  }, [detachListeners, appendLog]);

  type RemoteKey =
  | 'KEY_VOLUP' | 'KEY_VOLDOWN' | 'KEY_MUTE'
  | 'KEY_0' | 'KEY_1' | 'KEY_2' | 'KEY_3' | 'KEY_4' | 'KEY_5' | 'KEY_6' | 'KEY_7' | 'KEY_8' | 'KEY_9'
  | 'KEY_ENTER';


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

  useEffect(() => () => {
    // cleanup on unmount
    clearHeartbeat();
    detachListeners();
    try { Native.SamsungWs?.disconnect(); } catch {}
  }, [detachListeners]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Samsung TV Volume Remote</Text>
      <TextInput
        value={ip}
        onChangeText={setIp}
        placeholder="TV IP address"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.status}>Status: {status}</Text>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.connect]} onPress={connect}>
          <Text style={styles.btnText}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.disconnect]} onPress={disconnect}>
          <Text style={styles.btnText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => sendKey('KEY_VOLDOWN')}>
          <Text style={styles.btnText}>Vol −</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => sendKey('KEY_MUTE')}>
          <Text style={styles.btnText}>Mute</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => sendKey('KEY_VOLUP')}>
          <Text style={styles.btnText}>Vol +</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
  {[1,2,3,4,5].map(n => (
    <TouchableOpacity key={n} style={styles.btn} onPress={() => sendKey(`KEY_${n}` as RemoteKey)}>
      <Text style={styles.btnText}>{n}</Text>
    </TouchableOpacity>
  ))}
</View>


      <Text style={styles.logLabel}>Log</Text>
      <Text style={styles.log} numberOfLines={8}>
        {log.trim() || '(no log yet)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { ...textStyles.h3 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  status: { ...textStyles.buttonSmall, opacity: 0.7 },
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  connect: { backgroundColor: '#2d7' },
  disconnect: { backgroundColor: '#d55' },
  btnText: { ...textStyles.buttonSmall, color: 'white' },
  logLabel: { marginTop: 8, ...textStyles.bodyBold },
  log: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 8,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});
