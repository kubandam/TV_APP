import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Switch, FlatList, Pressable, StyleSheet } from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';

// ⬇️ adjust these imports to match your project
import type { SamsungDiscovery } from '@/src/useSamsungDiscovery';
import { findSamsungTVs } from '@/src/useSamsungDiscovery';

type Props = {
  onSelectTV?: (tv: SamsungDiscovery) => void | Promise<void>;
  initialKnown?: SamsungDiscovery[];
};

export default function TVWifiSettings({ onSelectTV, initialKnown = [] }: Props) {
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [tvs, setTvs] = useState<SamsungDiscovery[]>(initialKnown);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!wifiEnabled) return;
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
  }, [wifiEnabled]);

  const selectTV = (tv: SamsungDiscovery) => {
    console.log('selectTV', tv);
  };

  const subtitle = useMemo(() => {
    if (!wifiEnabled) return 'Wi-Fi vypnuto';
    if (scanning) return 'Hledám TV v síti…';
    return tvs.length ? `${tvs.length} nalezených zařízení` : 'Žádná TV nenalezena';
  }, [wifiEnabled, scanning, tvs.length]);

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

      <Text style={s.section}>Zařízení</Text>
      <Text style={s.subtitle}>{subtitle}</Text>

      <FlatList
        data={wifiEnabled ? tvs : []}
        keyExtractor={item => item.ip}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
        renderItem={({ item }) => (
          <Pressable style={s.deviceRow} onPress={() => selectTV(item)}>
            <Badge />
            <View style={{ flex: 1 }}>
              <Text style={s.deviceText} numberOfLines={1}>
                {item.name || item.raw?.['friendlyname'] || `TV ${item.ip}`}
              </Text>
              <Text style={s.deviceSub}>{item.ip}</Text>
            </View>
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

function Badge() {
  return (
    <View style={[s.badge, s.badgeBlue]}>
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
  badgePill: {
    backgroundColor: '#ffffff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4,
    minWidth: 28, alignItems: 'center', justifyContent: 'center',
  },
  badgePillText: { ...textStyles.captionBold, color: COLORS.textSecondary },
});
