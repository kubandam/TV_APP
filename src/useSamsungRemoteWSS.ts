import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Buffer } from 'buffer';
import { SamsungTVAPI } from './samsungTVApi';

interface SamsungTVResponse {
  event?: string;
  data?: any;
  id?: string;
  method?: string;
}

export function useSamsungRemoteWSS(ip: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pairingInProgress, setPairingInProgress] = useState(false);

  useEffect(() => {
    if (!ip) return;

    const connectToTV = async () => {
      setIsConnecting(true);

      try {
        const token = await SamsungTVAPI.getStoredToken(ip);

        const encodedAppName = Buffer.from('MyApp').toString('base64');
        const url = token
          ? `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${encodedAppName}&token=${token}`
          : `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${encodedAppName}`;

        console.log('[TV] Pripojujem sa na:', url);

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[TV] WSS pripojený');
          setIsConnecting(false);

          if (!token) {
            setPairingInProgress(true);
            console.log('[TV] Posielam pairing request...');

            const pairingMsg = {
              method: 'ms.channel.connect',
              params: {
                name: 'MyApp',
                type: 'SamsungTV',
              },
            };

            ws.send(JSON.stringify(pairingMsg));
          }
        };

        ws.onerror = e => {
          console.log('[TV] WSS error:', e);
          setIsConnecting(false);
          setPairingInProgress(false);
        };

        ws.onclose = () => {
          console.log('[TV] WSS zatvorený');
          setIsAuthenticated(false);
          setIsConnecting(false);
          setPairingInProgress(false);
        };

        ws.onmessage = event => {
          try {
            const response: SamsungTVResponse = JSON.parse(event.data);
            console.log('[TV] WSS odpoveď:', response);

            if (response.event === 'ms.channel.unauthorized') {
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

              if (response.data && response.data.token) {
                SamsungTVAPI.saveToken(ip, response.data.token);
              }
            } else if (response.event === 'ms.error') {
              console.log('[TV] WSS chyba:', response.data);
              setPairingInProgress(false);
            } else if (response.method === 'ms.channel.connect') {
              console.log('[TV] Pairing response:', response);
              if (response.data && response.data.token) {
                SamsungTVAPI.saveToken(ip, response.data.token);
                setIsAuthenticated(true);
                setPairingInProgress(false);
              }
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
      console.warn('[TV] WSS nie je pripravený');
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
      method: 'ms.channel.control',
      params: {
        Cmd: 'SetChannel',
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

      if (wsRef.current) {
        wsRef.current.close();
      }

      await SamsungTVAPI.removeToken(ip);

      const encodedAppName = Buffer.from('MyApp').toString('base64');
      const url = `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${encodedAppName}`;

      console.log('[TV] Začínam pairing na:', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TV] WSS pairing pripojený');

        const pairingMsg = {
          method: 'ms.channel.connect',
          params: {
            name: 'MyApp',
            type: 'SamsungTV',
          },
        };

        ws.send(JSON.stringify(pairingMsg));
      };

      ws.onmessage = event => {
        try {
          const response: SamsungTVResponse = JSON.parse(event.data);
          console.log('[TV] Pairing odpoveď:', response);

          if (response.event === 'ms.channel.unauthorized') {
            Alert.alert(
              'Potvrďte pripojenie',
              'Na TV sa zobrazila notifikácia. Potvrďte pripojenie aplikácie.',
              [{ text: 'OK' }],
            );
          } else if (response.event === 'ms.channel.connect') {
            setIsAuthenticated(true);
            setPairingInProgress(false);

            if (response.data && response.data.token) {
              SamsungTVAPI.saveToken(ip, response.data.token);
            }
          }
        } catch (error) {
          console.log('[TV] Neplatná JSON odpoveď:', event.data);
        }
      };

      return true;
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
