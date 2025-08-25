import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSamsungRemoteController, RemoteKey } from './useSamsungRemoteController';

// Storage keys
const STORAGE_KEYS = {
  CONNECTED_TV_IP: 'samsung_connected_tv_ip',
  CONNECTED_TV_NAME: 'samsung_connected_tv_name',
  AUTO_CONNECT: 'samsung_auto_connect_enabled',
} as const;

export type TVConnectionInfo = {
  ip: string;
  name: string;
  isConnected: boolean;
  autoConnectEnabled: boolean;
};

/**
 * Hook for managing persistent TV connections across the app
 * Provides a simple interface to connect/disconnect and manage saved TV connections
 */
export function usePersistentTVConnection() {
  const [connectionInfo, setConnectionInfo] = useState<TVConnectionInfo>({
    ip: '',
    name: '',
    isConnected: false,
    autoConnectEnabled: true,
  });

  // Use the full remote controller hook
  const remoteController = useSamsungRemoteController();

  // Load saved connection info on mount
  useEffect(() => {
    const loadConnectionInfo = async () => {
      try {
        const [savedIp, savedName, autoConnect] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_IP),
          AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.AUTO_CONNECT),
        ]);

        setConnectionInfo({
          ip: savedIp || '',
          name: savedName || '',
          isConnected: remoteController.isConnected,
          autoConnectEnabled: autoConnect !== 'false',
        });
      } catch (error) {
        console.error('Failed to load connection info:', error);
      }
    };

    loadConnectionInfo();
  }, []);


  // Update connection info when remote controller state changes
  useEffect(() => {
    setConnectionInfo(prev => {
      const newState = {
        ...prev,
        ip: remoteController.ip,
        isConnected: remoteController.isConnected,
        autoConnectEnabled: remoteController.autoConnectEnabled,
      };
      
      // Only update if something actually changed
      if (
        prev.ip !== newState.ip ||
        prev.isConnected !== newState.isConnected ||
        prev.autoConnectEnabled !== newState.autoConnectEnabled
      ) {
        return newState;
      }
      
      return prev;
    });
  }, [remoteController.ip, remoteController.isConnected, remoteController.autoConnectEnabled]);

  const connectToTV = useCallback(async (ip: string, name?: string) => {
    try {
      await remoteController.saveConnectedTV(ip, name);
      await remoteController.connect(ip);
      
      // Update local state immediately
      setConnectionInfo(prev => ({
        ...prev,
        ip,
        name: name || '',
        isConnected: true,
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to connect to TV:', error);
      return false;
    }
  }, [remoteController]);

  const disconnectFromTV = useCallback(async () => {
    try {
      remoteController.disconnect();
      
      // Update local state immediately
      setConnectionInfo(prev => ({
        ...prev,
        isConnected: false,
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to disconnect from TV:', error);
      return false;
    }
  }, [remoteController]);

  const forgetTV = useCallback(async () => {
    try {
      if (remoteController.isConnected) {
        remoteController.disconnect();
      }
      await remoteController.clearSavedTV();
      
      // Update local state immediately
      setConnectionInfo(prev => ({
        ...prev,
        ip: '',
        name: '',
        isConnected: false,
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to forget TV:', error);
      return false;
    }
  }, [remoteController]);

  const setAutoConnect = useCallback(async (enabled: boolean) => {
    try {
      await remoteController.setAutoConnect(enabled);
      
      // Update local state immediately
      setConnectionInfo(prev => ({
        ...prev,
        autoConnectEnabled: enabled,
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to set auto-connect:', error);
      return false;
    }
  }, [remoteController]);

  const getSavedTVInfo = useCallback(async () => {
    try {
      const [savedIp, savedName] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_IP),
        AsyncStorage.getItem(STORAGE_KEYS.CONNECTED_TV_NAME),
      ]);
      return { ip: savedIp, name: savedName };
    } catch (error) {
      console.error('Failed to get saved TV info:', error);
      return { ip: null, name: null };
    }
  }, []);

  // Force refresh connection state
  const refreshConnectionState = useCallback(() => {
    setConnectionInfo(prev => ({
      ...prev,
      isConnected: remoteController.isConnected,
      ip: remoteController.ip,
      autoConnectEnabled: remoteController.autoConnectEnabled,
    }));
  }, [remoteController.isConnected, remoteController.ip, remoteController.autoConnectEnabled]);

  // Channel test functionality
  const runChannelTest = useCallback((firstChannel: number, secondChannel: number, time = 2) => {
    const ms = time * 1000;
    if (!remoteController.isConnected) {
      console.error('Cannot run channel test: not connected to TV');
      return;
    }

    console.log(`Starting channel test: ${firstChannel} → ${secondChannel} → ${firstChannel || 'unknown'}`);

    // Step 1: Switch to first channel after 10 seconds
    setTimeout(() => {
      console.log(`Switching to first channel: ${firstChannel}`);
      switchToChannel(firstChannel);
    }, ms);

    // Step 2: Switch to second channel after 20 seconds
    setTimeout(() => {
      console.log(`Switching to second channel: ${secondChannel}`);
      switchToChannel(secondChannel);
    }, ms * 2);

    // Step 3: Return to original channel after 30 seconds
    setTimeout(() => {
      console.log(`Returning to original channel: ${firstChannel}`);
      switchToChannel(firstChannel);
    }, ms * 3);
  }, [remoteController]);

  // Helper function to switch to a specific channel
  const switchToChannel = useCallback((channelNumber: number) => {
    if (!remoteController.isConnected) {
      console.error('Cannot switch channel: not connected to TV');
      return;
    }

    const channelStr = channelNumber.toString();
    console.log(`Switching to channel: ${channelStr}`);

    // Send each digit of the channel number
    for (let i = 0; i < channelStr.length; i++) {
      const digit = parseInt(channelStr[i]);
      const key = `KEY_${digit}` as RemoteKey;
      
      // Send each digit with a small delay to ensure proper input
      setTimeout(() => {
        remoteController.sendKey(key);
      }, i * 200); // 200ms delay between digits
    }

    // Send ENTER after all digits to confirm the channel
    setTimeout(() => {
      remoteController.sendKey('KEY_ENTER');
    }, channelStr.length * 200 + 100);
  }, [remoteController]);

  return {
    // Connection state
    connectionInfo,
    
    // Connection management
    connectToTV,
    disconnectFromTV,
    forgetTV,
    setAutoConnect,
    getSavedTVInfo,
    refreshConnectionState,
    
    // Channel test functionality
    runChannelTest,
    
    // Remote controller access (for advanced usage)
    remoteController,
    
    // Convenience properties
    isConnected: connectionInfo.isConnected,
    connectedTVIP: connectionInfo.ip,
    connectedTVName: connectionInfo.name,
    autoConnectEnabled: connectionInfo.autoConnectEnabled,
  };
}
