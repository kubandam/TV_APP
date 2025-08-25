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
import { textStyles } from '@/app/theme/fonts';

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

  const handleRemoteControl = (tv: SamsungDiscovery) => {
    router.push({
      pathname: '/samsung-remote-demo',
      params: { ip: tv.ip },
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
          <View style={styles.item}>
            <TouchableOpacity
              style={styles.itemContent}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.itemText}>{item.ip}</Text>
              {item.location ? (
                <Text style={styles.location}>{item.location}</Text>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.remoteButton}
              onPress={() => handleRemoteControl(item)}
            >
              <Ionicons name="game-controller" size={20} color="white" />
              <Text style={styles.remoteButtonText}>Dálkové ovládání</Text>
            </TouchableOpacity>
          </View>
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
  title: { ...textStyles.h3 },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContent: {
    flex: 1,
  },
  remoteButton: {
    backgroundColor: '#EA5670',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  remoteButtonText: {
    ...textStyles.captionBold,
    color: 'white',
    marginLeft: 4,
  },
  itemText: { ...textStyles.h3 },
  location: { ...textStyles.caption, color: '#888' },
});
