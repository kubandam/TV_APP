import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Switch, FlatList, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';

// ⬇️ adjust these imports to match your project
import type { SamsungDiscovery } from '@/src/useSamsungDiscovery';
import { findSamsungTVs } from '@/src/useSamsungDiscovery';
import { RemoteKey, useSamsungRemoteController } from '@/src/useSamsungRemoteController';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersistentTVConnection } from '@/src/usePersistentTVConnection';
import { useFocusEffect } from '@react-navigation/native';

type Props = {
  initialKnown?: SamsungDiscovery[];
};

export default function ConnectionStatus({ initialKnown = [] }: Props) {
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [tvs, setTvs] = useState<SamsungDiscovery[]>(initialKnown);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedTv, setSelectedTv] = useState<SamsungDiscovery | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when needed

  // Use the enhanced remote controller hook
  const {
    ip,
    connect,
    disconnect,
    saveConnectedTV,
    clearSavedTV,
    setAutoConnect,
    autoConnectEnabled,
    connectedTvName,
  } = useSamsungRemoteController();

  const { 
    isConnected,
    remoteController 
  } = usePersistentTVConnection();

  // Refresh component state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Refresh the component state
      setRefreshKey(prev => prev + 1);
      
      // Update selected TV based on current connection without depending on tvs array
      if (isConnected && ip) {
        // Create a virtual TV object for the connected TV if it's not in the tvs array
        const connectedTV = tvs.find(tv => tv.ip === ip) || {
          ip: ip,
          name: connectedTvName || `TV ${ip}`,
          isConnected: true,
          raw: { friendlyname: connectedTvName || `TV ${ip}` }
        };
        setSelectedTv(connectedTV);
      } else {
        setSelectedTv(null);
      }
    }, [isConnected, ip, connectedTvName])
  );

  useEffect(() => {
    if (!wifiEnabled) return;
    setScanning(true);
    // Don't clear the tvs array immediately to preserve existing connections
    // Only clear if we're not currently connected
    if (!isConnected) {
      setTvs([]);
    }

    findSamsungTVs(
      tv => setTvs(prev => {
        const i = prev.findIndex(p => p.ip === tv.ip);
        if (i === -1) return [...prev, tv];
        const copy = prev.slice(); copy[i] = { ...copy[i], ...tv }; return copy;
      }),
      () => setScanning(false),
      5000,
    );
  }, [wifiEnabled, isConnected]); // Add isConnected to dependencies

  // Update TV connection status based on remote controller state
  useEffect(() => {
    setTvs(prev => prev.map(tv => ({
      ...tv,
      isConnected: tv.ip === ip && isConnected
    })));
  }, [ip, isConnected]); // Remove refreshKey to prevent loops

  const selectTV = async (tv: SamsungDiscovery) => {
    try {
      // If already connected to this TV, disconnect first
      if (isConnected && ip === tv.ip) {
        await disconnect();
        setSelectedTv(null);
        return;
      }

      // Save the TV connection for persistence
      await saveConnectedTV(tv.ip, tv.name || tv.raw?.['friendlyname']);
      setSelectedTv(tv);

      // Connect to the TV
      await connect(tv.ip);
    } catch (error) {
      console.error('Failed to connect to TV:', error);
    }
  };

  const handleAutoConnectToggle = async (enabled: boolean) => {
    await setAutoConnect(enabled);
  };

  const handleForgetTV = async () => {
    if (isConnected) {
      await disconnect();
    }
    await clearSavedTV();
    setSelectedTv(null);
  };

  const handleRefresh = () => {
    if (wifiEnabled) {
      setScanning(true);
      setTvs([]);
      
      findSamsungTVs(
        tv => setTvs(prev => {
          const i = prev.findIndex(p => p.ip === tv.ip);
          if (i === -1) return [...prev, tv];
          const copy = prev.slice(); copy[i] = { ...copy[i], ...tv }; return copy;
        }),
        () => setScanning(false),
        5000,
      );
    }
  };

  const subtitle = useMemo(() => {
    if (!wifiEnabled) return 'Wi-Fi vypnuto';
    if (scanning) return 'Hledám TV v síti…';
    if (isConnected) return `Připojeno k ${connectedTvName || ip}`;
    return tvs.length ? `${tvs.length} nalezených zařízení` : 'Žádná TV nenalezena';
  }, [wifiEnabled, scanning, tvs.length, isConnected, connectedTvName, ip]);

  return (
    <View>
      <View style={s.row}>
        <Text style={s.label}>Wi-Fi</Text>
        <Switch
          value={wifiEnabled}
          onValueChange={setWifiEnabled}
          trackColor={{ false: '#c9cbd3', true: '#4A6EB4' }}
          thumbColor="#ffffff"
          ios_backgroundColor="#c9cbd3"
          style={[s.switch, { transform: [{ scale: 1.5 }] }]}
        />
      </View>
      
      <View style={s.testCard}>
        <View style={s.statusRow}>
          <View
            style={[
              s.statusDot,
              {
                backgroundColor:
                  remoteController.status === 'CONNECTED'
                    ? '#29a329'
                    : remoteController.status === 'CONNECTING'
                    ? '#f0ad4e'
                    : remoteController.status === 'ERROR'
                    ? '#d9534f'
                    : '#9e9e9e',
              },
            ]}
          />
          <Text style={s.statusText}>
            {remoteController.status === 'CONNECTED'
              ? `Připojeno (${remoteController.ip})`
              : remoteController.status === 'CONNECTING'
              ? 'Připojuji…'
              : remoteController.status === 'ERROR'
              ? 'Chyba připojení'
              : 'Nepřipojeno'}
          </Text>
        </View>

        <View style={s.buttonRow}>
          <TouchableOpacity
            style={[
              s.testBtn,
              remoteController.status !== 'DISCONNECTED' && s.btnDisabled,
            ]}
            disabled={remoteController.status !== 'DISCONNECTED'}
            onPress={() => {
              if (ip) {
                remoteController.connect(ip);
              }
            }}
          >
            <Text style={s.testBtnText}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.testBtn, !remoteController.isConnected && s.btnDisabled]}
            disabled={!remoteController.isConnected}
            onPress={() => {
              remoteController.disconnect();
            }}
          >
            <Text style={s.testBtnText}>Disconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.testBtn, s.refreshBtn]}
            onPress={handleRefresh}
          >
            <Text style={s.testBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <View style={s.buttonRow}>
          <TouchableOpacity
            style={[s.testBtn, !remoteController.isConnected && s.btnDisabled]}
            disabled={!remoteController.isConnected}
            onPress={() => remoteController.sendKey('KEY_VOLDOWN')}
          >
            <Text style={s.testBtnText}>Vol −</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.testBtn, !remoteController.isConnected && s.btnDisabled]}
            disabled={!remoteController.isConnected}
            onPress={() => remoteController.sendKey('KEY_MUTE')}
          >
            <Text style={s.testBtnText}>Mute</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={[s.testBtn, !remoteController.isConnected && s.btnDisabled]}
            disabled={!remoteController.isConnected}
            onPress={() => remoteController.sendKey('KEY_VOLUP')}
          >
            <Text style={s.testBtnText}>Vol +</Text>
          </TouchableOpacity>
        </View>

        <View style={s.buttonRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              style={[
                s.numberBtn,
                !remoteController.isConnected && s.btnDisabled,
              ]}
              disabled={!remoteController.isConnected}
              onPress={() => remoteController.sendKey(`KEY_${n}` as RemoteKey)}
            >
              <Text style={s.numberBtnText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={s.row}>
        <Text style={s.label}>Auto-připojení</Text>
        <Switch
          value={autoConnectEnabled}
          onValueChange={handleAutoConnectToggle}
          trackColor={{ false: '#c9cbd3', true: '#4A6EB4' }}
          thumbColor="#ffffff"
          ios_backgroundColor="#c9cbd3"
          style={[s.switch, { transform: [{ scale: 1.5 }] }]}
        />
      </View>

      {isConnected && (
        <View style={s.connectedInfo}>
          <Text style={s.connectedText}>
            Připojeno k: {connectedTvName || ip}
          </Text>
          <Pressable style={s.forgetButton} onPress={handleForgetTV}>
            <Text style={s.forgetButtonText}>Zapomenout TV</Text>
          </Pressable>
        </View>
      )}

      <Text style={s.section}>Zařízení</Text>
      <Text style={s.subtitle}>{subtitle}</Text>

      <FlatList
        data={wifiEnabled ? tvs : []}
        keyExtractor={item => item.ip}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
        renderItem={({ item }) => (
          <Pressable style={s.deviceRow} onPress={() => selectTV(item)}>
            <Badge isConnected={item.isConnected} />
            <View style={{ flex: 1 }}>
              <Text style={s.deviceText} numberOfLines={1}>
                {item.name || item.raw?.['friendlyname'] || `TV ${item.ip}`}
              </Text>
              <Text style={s.deviceSub}>
                <Text style={{ color: '#4C6EF5', fontWeight: 'bold' }}>
                  {item.isConnected ? 'Připojeno ' : ''}
                </Text>
                {item.ip}
              </Text>
            </View>
            {item.isConnected && (
              <View style={s.statusIndicator}>
                <Text style={s.statusText}>●</Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: 8 }}>
            <Text style={s.empty}>
              {!wifiEnabled ? 'Wi-Fi je vypnuté' : 'Žádná TV nenalezena'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function Badge({ isConnected }: { isConnected?: boolean }) {
  return (
    <View style={[s.badge, isConnected ? s.badgeBlue : s.badgeWhite]}>
      <View style={s.badgePill}>
        <Text style={s.badgePillText}>TV</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  label: { ...textStyles.h2, color: COLORS.textSecondary },
  switch: { marginLeft: 'auto' },
  section: { ...textStyles.h3, color: COLORS.textSecondary, marginTop: 22 },
  subtitle: { ...textStyles.body, color: COLORS.textSecondary, opacity: 0.8, marginTop: 4 },
  listContent: { paddingTop: 10, paddingBottom: 18 },
  deviceRow: { flexDirection: 'row', alignItems: 'center' },
  deviceText: { ...textStyles.h3, color: COLORS.textSecondary },
  deviceSub: { ...textStyles.caption, color: COLORS.textSecondary, opacity: 0.8 },
  empty: { ...textStyles.body, color: COLORS.textSecondary, opacity: 0.85 },
  badge: {
    width: 38, height: 38, borderRadius: 19, marginRight: 12, alignItems: 'center', justifyContent: 'center',
  },
  badgeBlue: { backgroundColor: '#4C6EF5' },
  badgeWhite: { backgroundColor: '#ffffff' },
  badgePill: {
    backgroundColor: '#ffffff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4,
    minWidth: 28, alignItems: 'center', justifyContent: 'center',
  },
  badgePillText: { ...textStyles.captionBold, color: COLORS.textSecondary },
  connectedInfo: {
    backgroundColor: '#4C6EF5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectedText: { ...textStyles.body, color: '#ffffff', flex: 1 },
  forgetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  forgetButtonText: { ...textStyles.caption, color: '#ffffff' },
  statusIndicator: {
    marginLeft: 8,
  },
  statusText: {
    color: '#4C6EF5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 10, width: '100%' },
  testBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#9E9E9E' },
  refreshBtn: { 
    flex: 0.5, 
    backgroundColor: '#4C6EF5' 
  },
  testBtnText: { ...textStyles.buttonSmall, color: '#fff' },
  numberBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBtnText: { ...textStyles.buttonSmall, color: '#fff' },
  
});
