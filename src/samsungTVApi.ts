import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

export interface SamsungTVInfo {
  ip: string;
  name: string;
  model: string;
  token?: string;
}

const APP_NAME = 'TVControlApp';
const ENCODED_NAME = Buffer.from(APP_NAME).toString('base64');

export class SamsungTVAPI {
  private static async getDeviceInfo(ip: string): Promise<any> {
    try {
      const response = await fetch(`http://${ip}:8001/api/v2/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[TV] Chyba pri získavaní info:', error);
      throw error;
    }
  }

  static async startPairing(ip: string): Promise<boolean> {
    try {
      console.log('[TV] Začínam HTTP pairing proces...');

      const deviceInfo = await this.getDeviceInfo(ip);
      console.log('[TV] Device info:', deviceInfo);

      const pairingEndpoints = [
        `http://${ip}:8001/api/v2/`,
        `http://${ip}:8001/api/v2/channels/samsung.remote.control`,
        `http://${ip}:8001/api/v2/channels/samsung.remote.control/`,
        `http://${ip}:8001/api/v2/channels/samsung.remote.control?name=${ENCODED_NAME}`,
      ];

      for (const endpoint of pairingEndpoints) {
        try {
          console.log(`[TV] Skúšam endpoint: ${endpoint}`);

          const pairingResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: 'ms.channel.connect',
              params: {
                name: APP_NAME,
                type: 'SamsungTV',
              },
            }),
          });

          console.log(
            `[TV] Endpoint ${endpoint} status:`,
            pairingResponse.status,
          );

          if (pairingResponse.ok) {
            const pairingData = await pairingResponse.json();
            console.log('[TV] Pairing response data:', pairingData);

            if (pairingData.data && pairingData.data.token) {
              await AsyncStorage.setItem(
                `tv_token_${ip}`,
                pairingData.data.token,
              );
              console.log('[TV] Token uložený');
              return true;
            }

            console.log('[TV] Pairing úspešný bez token');
            return true;
          }
        } catch (endpointError) {
          console.log(`[TV] Endpoint ${endpoint} zlyhal:`, endpointError);
          continue;
        }
      }

      console.log(
        '[TV] Všetky HTTP endpointy zlyhali, skúšam WebSocket pairing',
      );
      return true;
    } catch (error) {
      console.error('[TV] Chyba pri pairing:', error);
      return false;
    }
  }

  static async getStoredToken(ip: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`tv_token_${ip}`);
    } catch (error) {
      console.error('[TV] Chyba pri načítaní token:', error);
      return null;
    }
  }

  static async saveToken(ip: string, token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`tv_token_${ip}`, token);
      console.log('[TV] Token uložený pre IP:', ip);
    } catch (error) {
      console.error('[TV] Chyba pri ukladaní token:', error);
    }
  }

  static async removeToken(ip: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`tv_token_${ip}`);
      console.log('[TV] Token odstránený pre IP:', ip);
    } catch (error) {
      console.error('[TV] Chyba pri odstraňovaní token:', error);
    }
  }

  static async testConnection(ip: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://${ip}:8001/api/v2/`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('[TV] Test pripojenia zlyhal:', error);
      return false;
    }
  }

  static async getClientKey(ip: string): Promise<string | null> {
    try {
      console.log('[TV] Získavam client-key cez HTTP...');

      const response = await fetch(`http://${ip}:8001/api/v2/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'ms.channel.connect',
          params: {
            name: APP_NAME,
            type: 'SamsungTV',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[TV] Client-key response:', data);

        if (data.data && data.data['client-key']) {
          return data.data['client-key'];
        }
      }

      return null;
    } catch (error) {
      console.error('[TV] Chyba pri získavaní client-key:', error);
      return null;
    }
  }

  static async checkPairingSupport(
    ip: string,
  ): Promise<{ supported: boolean; instructions: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo(ip);
      console.log('[TV] Kontrolujem podporu párovania...');

      const model = deviceInfo.device?.model || '';
      const version = deviceInfo.version || '';
      const tokenAuthSupport = deviceInfo.device?.TokenAuthSupport === 'true';

      console.log('[TV] Model:', model);
      console.log('[TV] Verzia:', version);
      console.log('[TV] TokenAuthSupport:', tokenAuthSupport);

      if (model.includes('KANTS2') || model.includes('5 Series')) {
        return {
          supported: false,
          instructions: `Táto TV model (${model}) môže mať obmedzenú podporu pre párovanie. Skúste:
          
1. Otvorte nastavenia TV
2. Prejdite na "Všeobecné" → "Externé manažéry"
3. Zapnite "Povoliť prístup k aplikáciám"
4. Skúste znova párovanie`,
        };
      }

      if (tokenAuthSupport) {
        return {
          supported: true,
          instructions: 'TV podporuje párovanie. Skúste párovanie znova.',
        };
      }

      return {
        supported: false,
        instructions:
          'TV nepodporuje automatické párovanie. Skúste manuálne nastavenie v TV.',
      };
    } catch (error) {
      console.error('[TV] Chyba pri kontrole podpory párovania:', error);
      return {
        supported: false,
        instructions: 'Nepodarilo sa skontrolovať podporu párovania.',
      };
    }
  }

  static async testDirectConnection(ip: string): Promise<boolean> {
    try {
      console.log('[TV] Testujem priame pripojenie...');

      const wsUrl = `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=${ENCODED_NAME}`;

      return new Promise(resolve => {
        const ws = new WebSocket(wsUrl);
        let connected = false;

        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            resolve(false);
          }
        }, 5000);

        ws.onopen = () => {
          console.log('[TV] Priame pripojenie úspešné');
          connected = true;
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          console.log('[TV] Priame pripojenie zlyhalo');
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('[TV] Chyba pri teste priameho pripojenia:', error);
      return false;
    }
  }
}
