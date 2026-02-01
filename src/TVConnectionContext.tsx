import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersistentTVConnection } from './usePersistentTVConnection';
import { useCommandPolling } from './useCommandPolling';
import { ToastAndroid, Platform } from 'react-native';

const SIMULATION_MODE_KEY = 'tv_simulation_mode';

// Simple toast helper that works on both platforms
const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS - just log to console, could use a toast library if needed
    console.log(`[Toast] ${message}`);
  }
};

export type SimulationLogEntry = {
  id: number;
  timestamp: Date;
  type: 'channel_switch' | 'command_received' | 'connection' | 'info';
  message: string;
  data?: any;
};

export type ChannelSwitchNotification = {
  id: number;
  channel: number;
  timestamp: Date;
};

type TVConnectionContextType = ReturnType<typeof usePersistentTVConnection> & {
  simulationMode: boolean;
  setSimulationMode: (enabled: boolean) => Promise<void>;
  simulationLogs: SimulationLogEntry[];
  clearSimulationLogs: () => void;
  addSimulationLog: (type: SimulationLogEntry['type'], message: string, data?: any) => void;
  lastChannelSwitch: ChannelSwitchNotification | null;
};

// Create the context
const TVConnectionContext = createContext<TVConnectionContextType | null>(null);

// Provider component
export function TVConnectionProvider({ children }: { children: ReactNode }) {
  const connection = usePersistentTVConnection();
  const [simulationMode, setSimulationModeState] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<SimulationLogEntry[]>([]);
  const [lastChannelSwitch, setLastChannelSwitch] = useState<ChannelSwitchNotification | null>(null);
  const logIdRef = React.useRef(0);
  const notificationIdRef = React.useRef(0);

  // Load simulation mode on mount
  useEffect(() => {
    AsyncStorage.getItem(SIMULATION_MODE_KEY).then(value => {
      if (value === 'true') {
        setSimulationModeState(true);
        console.log('🎮 [Simulation] Mode enabled from storage');
      }
    });
  }, []);

  const addSimulationLog = useCallback((
    type: SimulationLogEntry['type'],
    message: string,
    data?: any
  ) => {
    const entry: SimulationLogEntry = {
      id: ++logIdRef.current,
      timestamp: new Date(),
      type,
      message,
      data,
    };
    setSimulationLogs(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 logs
    console.log(`🎮 [Simulation] ${type}: ${message}`, data || '');
  }, []);

  const clearSimulationLogs = useCallback(() => {
    setSimulationLogs([]);
  }, []);

  const setSimulationMode = useCallback(async (enabled: boolean) => {
    setSimulationModeState(enabled);
    await AsyncStorage.setItem(SIMULATION_MODE_KEY, enabled.toString());
    addSimulationLog('info', enabled ? 'Simulation mode ENABLED' : 'Simulation mode DISABLED');
  }, [addSimulationLog]);

  // Simulated switch channel function
  const simulatedSwitchToChannel = useCallback(async (channel: number) => {
    addSimulationLog('channel_switch', `Switching to channel ${channel}`, { channel });
    
    // Set last channel switch notification (will auto-clear after 3 seconds)
    const notification: ChannelSwitchNotification = {
      id: ++notificationIdRef.current,
      channel,
      timestamp: new Date(),
    };
    setLastChannelSwitch(notification);
    
    // Show non-blocking toast instead of alert
    showToast(`📺 Simulácia: Prepínam na kanál ${channel}`);

    // Auto-clear notification after 3 seconds
    setTimeout(() => {
      setLastChannelSwitch(prev => prev?.id === notification.id ? null : prev);
    }, 3000);

    // Simulate small delay like real TV would have
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [addSimulationLog]);

  // Determine if we should act as "connected"
  const isEffectivelyConnected = simulationMode || connection.isConnected;

  // Start polling automatically when TV is connected OR in simulation mode
  useEffect(() => {
    if (isEffectivelyConnected) {
      console.log(`\n📺 [TVConnection] ${simulationMode ? 'Simulation mode' : 'TV connected'} - polling will start automatically`);
    } else {
      console.log(`\n📺 [TVConnection] TV not connected - polling disabled`);
    }
  }, [isEffectivelyConnected, simulationMode]);

  useCommandPolling(
    async (channel: number) => {
      console.log(`\n🎯 [TVConnection] Received switch channel command: ${channel}`);
      addSimulationLog('command_received', `Received command: switch to channel ${channel}`, { channel });

      if (simulationMode) {
        // In simulation mode, just log and show toast
        console.log(`🎮 [Simulation] Would switch to channel ${channel}`);
        await simulatedSwitchToChannel(channel);
      } else if (connection.switchToChannel) {
        console.log(`📺 [Real TV] Switching to channel ${channel}`);
        // Show non-blocking toast for real TV too
        showToast(`📺 Prepínam na kanál ${channel}`);
        await connection.switchToChannel(channel);
      } else {
        console.warn(`⚠️ [TVConnection] switchToChannel function not available`);
      }
    },
    {
      enabled: isEffectivelyConnected,
      pollInterval: 500,
      maxCommandAge: 30, // Only process commands from last 30 seconds
      showAlerts: false, // Don't show alert popups
    }
  );

  // Build the enhanced connection object
  const enhancedConnection: TVConnectionContextType = {
    ...connection,
    // Override isConnected and related properties in simulation mode
    isConnected: isEffectivelyConnected,
    connectedTVName: simulationMode ? 'Simulovaná TV' : connection.connectedTVName,
    connectedTVIP: simulationMode ? '192.168.0.999' : connection.connectedTVIP,
    // Override switchToChannel in simulation mode
    switchToChannel: simulationMode ? simulatedSwitchToChannel : connection.switchToChannel,
    // Override remoteController in simulation mode
    remoteController: simulationMode
      ? {
          ...connection.remoteController,
          isConnected: true,
          sendKey: (key: string) => {
            addSimulationLog('info', `Simulated key press: ${key}`, { key });
          }
        }
      : connection.remoteController,
    // Simulation mode properties
    simulationMode,
    setSimulationMode,
    simulationLogs,
    clearSimulationLogs,
    addSimulationLog,
    lastChannelSwitch,
  };

  return (
    <TVConnectionContext.Provider value={enhancedConnection}>
      {children}
    </TVConnectionContext.Provider>
  );
}

// Hook to use the connection
export function useTVConnection(): TVConnectionContextType {
  const context = useContext(TVConnectionContext);
  if (!context) {
    throw new Error('useTVConnection must be used within a TVConnectionProvider');
  }
  return context;
}
