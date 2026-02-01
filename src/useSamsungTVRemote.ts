import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import SamsungTVRemote from '@ersinayaz/rn-samsung-tv-remote';

interface UseSamsungTVRemoteOptions {
  ip: string;
  port?: number;
  name?: string;
  timeout?: number;
  autoConnect?: boolean;
}

interface UseSamsungTVRemoteReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Remote control methods
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendKey: (key: string) => Promise<void>;
  sendChannel: (channelNumber: string) => Promise<void>;
  sendVolume: (direction: 'up' | 'down') => Promise<void>;
  
  // Utility methods
  powerToggle: () => Promise<void>;
  muteToggle: () => Promise<void>;
  home: () => Promise<void>;
  back: () => Promise<void>;
  menu: () => Promise<void>;
  
  // Media controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  rewind: () => Promise<void>;
  fastForward: () => Promise<void>;
  
  // Navigation
  up: () => Promise<void>;
  down: () => Promise<void>;
  left: () => Promise<void>;
  right: () => Promise<void>;
  enter: () => Promise<void>;
  
  // Channel controls
  channelUp: () => Promise<void>;
  channelDown: () => Promise<void>;
  
  // Volume controls
  volumeUp: () => Promise<void>;
  volumeDown: () => Promise<void>;
  
  // Color buttons
  red: () => Promise<void>;
  green: () => Promise<void>;
  yellow: () => Promise<void>;
  blue: () => Promise<void>;
  
  // Number pad
  sendNumber: (number: number) => Promise<void>;
}

export function useSamsungTVRemote({
  ip,
  port = 8001,
  name = 'TVControlApp',
  timeout = 5000,
  autoConnect = false,
}: UseSamsungTVRemoteOptions): UseSamsungTVRemoteReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const remoteRef = useRef<SamsungTVRemote | null>(null);

  useEffect(() => {
    if (autoConnect && ip) {
      connect();
    }

    return () => {
      if (remoteRef.current) {
        remoteRef.current.disconnect();
      }
    };
  }, [ip, autoConnect]);

  const connect = async (): Promise<boolean> => {
    if (!ip) {
      setConnectionError('IP address is required');
      return false;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      const remote = new SamsungTVRemote({
        ip,
        port,
        name,
        timeout,
      });

      remoteRef.current = remote;

      const connected = await remote.connect();
      
      if (connected) {
        setIsConnected(true);
        setIsConnecting(false);
        console.log('Successfully connected to Samsung TV');
        return true;
      } else {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError('Failed to connect to TV');
        return false;
      }
    } catch (error) {
      console.error('Error connecting to TV:', error);
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      if (remoteRef.current) {
        await remoteRef.current.disconnect();
        remoteRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
      console.log('Disconnected from Samsung TV');
    } catch (error) {
      console.error('Error disconnecting from TV:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const sendKey = async (key: string): Promise<void> => {
    if (!remoteRef.current || !isConnected) {
      throw new Error('Not connected to TV');
    }

    try {
      await remoteRef.current.sendKey(key);
      console.log(`Sent key: ${key}`);
    } catch (error) {
      console.error(`Error sending key ${key}:`, error);
      throw error;
    }
  };

  const sendChannel = async (channelNumber: string): Promise<void> => {
    if (!remoteRef.current || !isConnected) {
      throw new Error('Not connected to TV');
    }

    try {
      // Clear any existing input
      await remoteRef.current.sendKey('KEY_0');
      
      // Send each digit with a small delay
      for (const digit of channelNumber) {
        await remoteRef.current.sendKey(`KEY_${digit}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Changed to channel: ${channelNumber}`);
    } catch (error) {
      console.error('Error changing channel:', error);
      throw error;
    }
  };

  const sendVolume = async (direction: 'up' | 'down'): Promise<void> => {
    const key = direction === 'up' ? 'KEY_VOLUP' : 'KEY_VOLDOWN';
    await sendKey(key);
  };

  // Power controls
  const powerToggle = () => sendKey('KEY_POWER');
  const muteToggle = () => sendKey('KEY_MUTE');

  // Navigation controls
  const home = () => sendKey('KEY_HOME');
  const back = () => sendKey('KEY_RETURN');
  const menu = () => sendKey('KEY_MENU');
  const up = () => sendKey('KEY_UP');
  const down = () => sendKey('KEY_DOWN');
  const left = () => sendKey('KEY_LEFT');
  const right = () => sendKey('KEY_RIGHT');
  const enter = () => sendKey('KEY_ENTER');

  // Channel controls
  const channelUp = () => sendKey('KEY_CHUP');
  const channelDown = () => sendKey('KEY_CHDOWN');

  // Volume controls
  const volumeUp = () => sendVolume('up');
  const volumeDown = () => sendVolume('down');

  // Media controls
  const play = () => sendKey('KEY_PLAY');
  const pause = () => sendKey('KEY_PAUSE');
  const stop = () => sendKey('KEY_STOP');
  const rewind = () => sendKey('KEY_REWIND');
  const fastForward = () => sendKey('KEY_FF');

  // Color buttons
  const red = () => sendKey('KEY_RED');
  const green = () => sendKey('KEY_GREEN');
  const yellow = () => sendKey('KEY_YELLOW');
  const blue = () => sendKey('KEY_BLUE');

  // Number pad
  const sendNumber = (number: number) => sendKey(`KEY_${number}`);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Connection methods
    connect,
    disconnect,
    sendKey,
    sendChannel,
    sendVolume,
    
    // Power controls
    powerToggle,
    muteToggle,
    
    // Navigation
    home,
    back,
    menu,
    up,
    down,
    left,
    right,
    enter,
    
    // Channel controls
    channelUp,
    channelDown,
    
    // Volume controls
    volumeUp,
    volumeDown,
    
    // Media controls
    play,
    pause,
    stop,
    rewind,
    fastForward,
    
    // Color buttons
    red,
    green,
    yellow,
    blue,
    
    // Number pad
    sendNumber,
  };
}
