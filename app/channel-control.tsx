import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { textStyles } from '@/app/theme/fonts';

export default function ChannelControlScreen() {

  const handleUpPress = () => {
    Alert.alert('Channel Up', 'Switching to next channel');
  };

  const handleDownPress = () => {
    Alert.alert('Channel Down', 'Switching to previous channel');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="settings"
          size={24}
          color="#333"
          style={styles.gearIcon}
        />
        <Text style={styles.title}>Channel Control</Text>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: '#4CAF50'
              },
            ]}
          />
          <Text style={styles.statusText}>
            Connected
          </Text>
          
        </View>

        <Text style={styles.controlsTitle}>Channel Navigation</Text>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
            ]}
            onPress={handleUpPress}
          >
            <Ionicons
              name="chevron-up"
              size={32}
              color={'#333'}
            />
            <Text style={styles.controlText}>CH UP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlButton,
            ]}
            onPress={handleDownPress}
          >
            <Ionicons
              name="chevron-down"
              size={32}
              color={'#333'}
            />
            <Text style={styles.controlText}>CH DOWN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF69B4',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  gearIcon: {
    marginBottom: 10,
  },
  title: {
    ...textStyles.h3,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  controlsTitle: {
    ...textStyles.bodyBold,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
  },
  controlText: {
    ...textStyles.buttonSmall,
    color: '#333',
    marginTop: 5,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    ...textStyles.buttonSmall,
    color: '#333',
    marginRight: 10,
  },
  pairingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pairingButtonText: {
    ...textStyles.captionBold,
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
