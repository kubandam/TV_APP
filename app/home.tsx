import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';
import { router } from 'expo-router';
import ChannelsButtons from './components/ChannelsButtons';
import { Ionicons } from '@expo/vector-icons';
import {
  loadSelectedChannels,
  saveSelectedChannels,
  SavedChannel,
} from './storage/channels';
import { RemoteKey } from '@/src/useSamsungRemoteController';
import { usePersistentTVConnection } from '@/src/usePersistentTVConnection';
import { useFocusEffect } from '@react-navigation/native';

// New local type (= what ChannelsButtons expects)
type Channel = { label: string; appOrder: number; tvNumber?: number };

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(
    new Set(),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Use the persistent TV connection hook
  const { 
    isConnected, 
    connectedTVIP, 
    connectedTVName,
    remoteController,
    refreshConnectionState
  } = usePersistentTVConnection();

  // Refresh connection state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshConnectionState();
    }, [refreshConnectionState])
  );

  // Load + migrate old shape {label,index} -> {label,appOrder}
  useEffect(() => {
    (async () => {
      const saved = await loadSelectedChannels();
      const migrated: Channel[] = (saved || []).map((c: any, i: number) => ({
        label: c.label,
        appOrder:
          typeof c.appOrder === 'number' ? c.appOrder : c.index ?? i + 1,
        tvNumber: c.tvNumber,
      }));
      setChannels(migrated.sort((a, b) => a.appOrder - b.appOrder));
    })();
  }, []);

  // persist helper (re-number appOrder 1..N)
  const persist = async (list: Channel[]) => {
    const normalized = list
      .sort((a, b) => a.appOrder - b.appOrder)
      .map((c, i) => ({ ...c, appOrder: i + 1 }));
    setChannels(normalized);
    // save under new shape
    await saveSelectedChannels(normalized as unknown as SavedChannel[]);
  };

  const toggleSelect = (label: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!selectedForDelete.size) return;
    const next = channels.filter(c => !selectedForDelete.has(c.label));
    setSelectedForDelete(new Set());
    await persist(next);
  };

  // from drag: [{label, appOrder}]
  const handleReorder = async (
    order: { label: string; appOrder: number }[],
  ) => {
    const next = channels.map(c => {
      const found = order.find(o => o.label === c.label);
      return found ? { ...c, appOrder: found.appOrder } : c;
    });
    await persist(next);
  };

  // from popup: set the TV number
  const handleSetTvNumber = (label: string, tvNumber: number) => {
    setChannels(prev => {
      const next = prev.map(c => (c.label === label ? { ...c, tvNumber } : c));
      // also persist
      saveSelectedChannels(next as unknown as SavedChannel[]);
      return next;
    });
  };
  
  const handleRemoveChannel = async (label: string) => {
    setChannels(prev => {
      const next = prev.filter(c => c.label !== label);
      saveSelectedChannels(next as any);
      return next;
    });
    // also clear any selection-for-delete state if you rely on it
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      next.delete(label);
      return next;
    });
  };

  // Channel switching functionality
  const handleChannelPress = async (tvNumber: number) => {
    if (!isConnected) {
      Alert.alert(
        'Nepřipojeno k TV', 
        'Nejprve se připojte k TV v nastavení.',
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Nastavení', onPress: () => router.push('/settings') }
        ]
      );
      return;
    }

    try {
      // Send channel number digit by digit
      const digits = String(tvNumber).split('').map(Number);
      
      for (const digit of digits) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between digits
        remoteController.sendKey(`KEY_${digit}` as RemoteKey);
      }
      
      // Send ENTER to confirm the channel
      await new Promise(resolve => setTimeout(resolve, 300));
      remoteController.sendKey('KEY_ENTER');
      
      Alert.alert('Odesláno', `TV by se měla přepnout na kanál ${tvNumber}.`);
    } catch (error) {
      console.error('Failed to send channel:', error);
      Alert.alert('Chyba', 'Nepodařilo se odeslat kanál na TV.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="settings"
          size={30}
          color={COLORS.textPrimary}
          onPress={() => router.push('/settings')}
        />
        {selectedForDelete.size > 0 && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>Smazat</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Na kterou TV stanici chceš přepnout?</Text>
      
      {/* Connection status indicator */}
      {/* <View style={styles.connectionStatus}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isConnected ? '#29a329' : '#d9534f',
            },
          ]}
        />
        <Text style={styles.statusText}>
          {isConnected 
            ? `Připojeno k ${connectedTVName || connectedTVIP}`
            : 'Nepřipojeno k TV'
          }
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            refreshConnectionState();
          }}
        >
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View> */}

      {/* --- Testing panel --- */}

      {/* --- /Testing panel --- */}

      <ChannelsButtons
        channels={channels} // {label, appOrder, tvNumber}
        selectedSet={selectedForDelete} // ✅ was undefined before
        onToggleSelect={toggleSelect} // ✅ was wrong name before
        onReorder={handleReorder}
        onSetTvNumber={handleSetTvNumber}
        onRemoveChannel={handleRemoveChannel}
        onChannelPress={handleChannelPress} // Now connected to TV
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    padding: 30,
  },
  header: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    right: 0,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    backgroundColor: '#FFD33D',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  deleteText: { ...textStyles.buttonSmall, color: COLORS.textPrimary },
  title: {
    ...textStyles.h3,
    width: '80%',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 20,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { ...textStyles.body, color: COLORS.textPrimary, flex: 1 },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshButtonText: {
    fontSize: 16,
  },
});
