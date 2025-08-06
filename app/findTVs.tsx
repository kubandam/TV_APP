import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { findSamsungTVs, SamsungDiscovery } from '../src/findSamsungTVs';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TVSelectionScreen() {
  const [tvs, setTvs] = useState<SamsungDiscovery[]>([]);
  const [scanning, setScanning] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setTvs([]);
    setScanning(true);
    findSamsungTVs(
      tv =>
        setTvs(prev => (prev.find(p => p.ip === tv.ip) ? prev : [...prev, tv])),
      () => setScanning(false),
    );
  }, []);

  const handleSelect = (tv: SamsungDiscovery) => {
    router.push({
      pathname: '/channel-control',
      params: { ip: tv.ip, location: tv.location || '' },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.back} onPress={() => router.push('/home')}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Vyber TV na pripojenie</Text>
      </View>
      {scanning && (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ margin: 16 }}
        />
      )}
      <FlatList
        data={tvs}
        keyExtractor={item => item.ip}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => handleSelect(item)}
          >
            <Text style={styles.itemText}>{item.ip}</Text>
            {item.location ? (
              <Text style={styles.location}>{item.location}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={!scanning ? <Text>Žiadne TV nenájdené</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 20,
  },
  back: {
    width: 24,
    height: 24,
    backgroundColor: 'transparent',
  },
  item: {
    padding: 16,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 12,
    width: 320,
  },
  itemText: { fontSize: 18, fontWeight: '500' },
  location: { fontSize: 12, color: '#888' },
});
