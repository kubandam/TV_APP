
import { NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { SamsungWs } = NativeModules || {};

export async function connectSecureAndPair(ip: string, appNameB64: string) {
  if (!SamsungWs) throw new Error('SamsungWs native module not available');

  const url = `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${appNameB64}`;
  const emitter = new NativeEventEmitter(SamsungWs);

  return new Promise<string>(async (resolve, reject) => {
    const subOpen = emitter.addListener('SamsungWs_open', () => {});
    const subMsg = emitter.addListener('SamsungWs_message', async (text: string) => {
      try {
        const msg = JSON.parse(text);
        if (msg?.event === 'ms.channel.connect' && msg?.data?.token) {
          const token = String(msg.data.token);
          await AsyncStorage.setItem(`samsung_token_${ip}`, token);
          subOpen.remove(); subMsg.remove(); subErr.remove(); subClose.remove();
          resolve(token);
        }
      } catch {}
    });
    const subErr = emitter.addListener('SamsungWs_error', (err: string) => {
      subOpen.remove(); subMsg.remove(); subErr.remove(); subClose.remove();
      reject(new Error(err || 'secure ws error'));
    });
    const subClose = emitter.addListener('SamsungWs_closed', (_evt: any) => {});

    try {
      await SamsungWs.connect(url, ip);
      // TV should show pairing prompt now. Accept on TV.
    } catch (e: any) {
      subOpen.remove(); subMsg.remove(); subErr.remove(); subClose.remove();
      reject(e);
    }
  });
}
