import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { findSamsungTVs, SamsungDiscovery } from './src/findSamsungTVs';

export default function App() {
  const [tvs, setTvs] = useState<SamsungDiscovery[]>([]);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    findSamsungTVs(
      (tv) => setTvs((prev) => (prev.find((p) => p.ip === tv.ip) ? prev : [...prev, tv])),
      () => setScanning(false)
    );
  }, []);

  return (
    <View style={styles.container}>
      {scanning && <Text>Scanning…</Text>}
      <FlatList
        data={tvs}
        keyExtractor={(item) => item.ip}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {}}
            style={styles.item}
          >
            <Text>Samsung TV ({item.ip})</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{item.location}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, marginTop: 100 },
  item: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  subtitle: { fontSize: 12, opacity: 0.6 },
});
