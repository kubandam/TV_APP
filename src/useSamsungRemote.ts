import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SamsungTVAPI } from './samsungTVApi';

interface SamsungTVResponse {
  type?: string;
  payload?: any;
  event?: string;
  data?: any;
  id?: string;
  method?: string;
}

const APP_NAME = 'TVControlApp';
const ENCODED_NAME = Buffer.from(APP_NAME).toString('base64');

export function useSamsungRemote(ip: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pairingInProgress, setPairingInProgress] = useState(false);
  const [clientKey, setClientKey] = useState<string | null>(null);

  useEffect(() => {
    if (!ip) return;

    const connectToTV = async () => {
      setIsConnecting(true);

      try {
        const savedKey = await AsyncStorage.getItem(`tv_client_key_${ip}`);
        setClientKey(savedKey);

        let wsUrl = `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=${ENCODED_NAME}`;
        if (savedKey) {
          wsUrl += `&client-key=${savedKey}`;
          console.log('[TV] Pripojujem sa s client-key');
        } else {
          console.log(
            '[TV] Pripojujem sa bez client-key - potrebuje sa pairing',
          );
          setPairingInProgress(true);
        }

        console.log('[TV] WebSocket URL:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[TV] WebSocket pripojený');
          setIsConnecting(false);
        };

        ws.onerror = e => {
          console.log('[TV] WebSocket error:', e);
          setIsConnecting(false);
          setPairingInProgress(false);
        };

        ws.onclose = () => {
          console.log('[TV] WebSocket zatvorený');
          setIsAuthenticated(false);
          setIsConnecting(false);
          setPairingInProgress(false);
        };

        ws.onmessage = async event => {
          try {
            const response: SamsungTVResponse = JSON.parse(event.data);
            console.log('[TV] Odpoveď:', response);

            if (
              response.type === 'registered' &&
              response.payload?.['client-key']
            ) {
              const newClientKey = response.payload['client-key'];
              await AsyncStorage.setItem(`tv_client_key_${ip}`, newClientKey);
              setClientKey(newClientKey);
              setIsAuthenticated(true);
              setPairingInProgress(false);

              console.log('[TV] Client-key uložený:', newClientKey);
              Alert.alert(
                'Úspešne pripojené',
                'TV je teraz pripojená a môžete ju ovládať.',
              );
            } else if (response.event === 'ms.channel.unauthorized') {
              console.log(
                '[TV] Potrebuje sa pairing - otvor TV a potvrď pripojenie',
              );
              setPairingInProgress(true);

              Alert.alert(
                'Potvrďte pripojenie',
                'Na TV sa zobrazila notifikácia. Potvrďte pripojenie aplikácie.',
                [{ text: 'OK' }],
              );
            } else if (response.event === 'ms.channel.connect') {
              console.log('[TV] Autentifikácia úspešná');
              setIsAuthenticated(true);
              setPairingInProgress(false);
            } else if (response.event === 'ms.error') {
              console.log('[TV] Chyba:', response.data);
              setPairingInProgress(false);
            }
          } catch (error) {
            console.log('[TV] Neplatná JSON odpoveď:', event.data);
          }
        };

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('[TV] Chyba pri pripájaní:', error);
        setIsConnecting(false);
        setPairingInProgress(false);
      }
    };

    connectToTV();
  }, [ip]);

  function sendKey(key: string) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[TV] WebSocket nie je pripravený');
      return;
    }

    if (!isAuthenticated) {
      console.warn('[TV] Nie je autentifikovaný - potrebuje sa pairing');
      return;
    }

    const msg = {
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: key,
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey',
      },
    };

    ws.send(JSON.stringify(msg));
    console.log('[TV] Posielam príkaz:', key);
  }

  function sendChannelNumber(channelNumber: number) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated) {
      console.warn('[TV] Nie je pripravený na odoslanie kanálu');
      return;
    }

    const msg = {
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: channelNumber.toString(),
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey',
      },
    };

    ws.send(JSON.stringify(msg));
    console.log('[TV] Prepínam na kanál:', channelNumber);
  }

  const startPairing = async () => {
    try {
      setPairingInProgress(true);

      await AsyncStorage.removeItem(`tv_client_key_${ip}`);
      setClientKey(null);

      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log('[TV] Skúšam HTTP pairing...');
      const success = await SamsungTVAPI.startPairing(ip);

      if (success) {
        const newClientKey = await SamsungTVAPI.getClientKey(ip);

        if (newClientKey) {
          await AsyncStorage.setItem(`tv_client_key_${ip}`, newClientKey);
          setClientKey(newClientKey);
          setIsAuthenticated(true);
          setPairingInProgress(false);

          console.log('[TV] Nový client-key uložený:', newClientKey);
          Alert.alert(
            'Úspešne pripojené',
            'TV je teraz pripojená a môžete ju ovládať.',
          );
        } else {
          console.log(
            '[TV] HTTP pairing úspešný, ale nemám client-key - kontrolujem podporu párovania',
          );

          const pairingSupport = await SamsungTVAPI.checkPairingSupport(ip);

          if (!pairingSupport.supported) {
            setPairingInProgress(false);
            Alert.alert(
              'Obmedzená podpora párovania',
              pairingSupport.instructions,
              [
                { text: 'OK' },
                {
                  text: 'Skús priame pripojenie',
                  onPress: async () => {
                    const directConnection =
                      await SamsungTVAPI.testDirectConnection(ip);
                    if (directConnection) {
                      const wsUrl = `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=${ENCODED_NAME}`;
                      const ws = new WebSocket(wsUrl);
                      wsRef.current = ws;

                      ws.onopen = () => {
                        console.log('[TV] WebSocket pre príkazy pripojený');
                      };

                      ws.onmessage = event => {
                        try {
                          const response = JSON.parse(event.data);
                          console.log('[TV] WebSocket odpoveď:', response);

                          if (response.event === 'ms.channel.unauthorized') {
                            console.log(
                              '[TV] Stále unauthorized - skúšam bez autentifikácie',
                            );
                            setIsAuthenticated(true);
                            setPairingInProgress(false);
                            Alert.alert(
                              'Pripojené (bez autentifikácie)',
                              'TV je pripojená, ale môže mať obmedzené funkcie.',
                            );
                          } else if (response.type === 'registered') {
                            console.log('[TV] WebSocket úspešne registrovaný');
                            setIsAuthenticated(true);
                            setPairingInProgress(false);
                            Alert.alert(
                              'Pripojené',
                              'TV je teraz pripojená a môžete ju ovládať.',
                            );
                          }
                        } catch (error) {
                          console.log(
                            '[TV] Neplatná JSON odpoveď:',
                            event.data,
                          );
                        }
                      };

                      ws.onerror = error => {
                        console.error('[TV] WebSocket error:', error);
                        Alert.alert(
                          'Chyba',
                          'Nepodarilo sa pripojiť pre odosielanie príkazov.',
                        );
                      };

                      ws.onclose = () => {
                        console.log('[TV] WebSocket pre príkazy zatvorený');
                        setIsAuthenticated(false);
                      };
                    } else {
                      Alert.alert('Chyba', 'Priame pripojenie zlyhalo.');
                    }
                  },
                },
              ],
            );
          } else {
            console.log('[TV] Skúšam WebSocket pairing...');

            const wsUrl = `ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=${ENCODED_NAME}`;
            console.log('[TV] Začínam WebSocket pairing na:', wsUrl);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
              console.log('[TV] WebSocket pairing pripojený');
            };

            ws.onmessage = async event => {
              try {
                const response: SamsungTVResponse = JSON.parse(event.data);
                console.log('[TV] WebSocket pairing odpoveď:', response);

                if (
                  response.type === 'registered' &&
                  response.payload?.['client-key']
                ) {
                  const newClientKey = response.payload['client-key'];
                  await AsyncStorage.setItem(
                    `tv_client_key_${ip}`,
                    newClientKey,
                  );
                  setClientKey(newClientKey);
                  setIsAuthenticated(true);
                  setPairingInProgress(false);

                  console.log('[TV] Nový client-key uložený:', newClientKey);
                  Alert.alert(
                    'Úspešne pripojené',
                    'TV je teraz pripojená a môžete ju ovládať.',
                  );
                }
              } catch (error) {
                console.log('[TV] Neplatná JSON odpoveď:', event.data);
              }
            };
          }
        }
      } else {
        setPairingInProgress(false);
        Alert.alert(
          'Chyba pri párování',
          'Nepodarilo sa pripojiť k TV. Skontrolujte, či je TV zapnutá a v rovnakej sieti.',
        );
      }

      return success;
    } catch (error) {
      console.error('[TV] Chyba pri pairing:', error);
      setPairingInProgress(false);
      return false;
    }
  };

  return {
    sendKey,
    sendChannelNumber,
    isAuthenticated,
    isConnecting,
    pairingInProgress,
    startPairing,
  };
}
