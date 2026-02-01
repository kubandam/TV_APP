import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePersistentTVConnection } from '@/src/usePersistentTVConnection';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';

type Props = {
  showConnectButton?: boolean;
  onConnectPress?: () => void;
  compact?: boolean;
};

/**
 * Reusable TV connection status component
 * Shows current connection status and optionally a connect button
 */
export default function TVConnectionStatus({ 
  showConnectButton = false, 
  onConnectPress,
  compact = false 
}: Props) {
  const { 
    isConnected, 
    connectedTVIP, 
    connectedTVName,
    connectToTV,
    disconnectFromTV 
  } = usePersistentTVConnection();

  const handleConnectPress = () => {
    if (onConnectPress) {
      onConnectPress();
    } else if (connectedTVIP) {
      // Auto-connect to saved TV
      connectToTV(connectedTVIP, connectedTVName);
    }
  };

  const handleDisconnect = () => {
    disconnectFromTV();
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isConnected ? '#29a329' : '#d9534f' }
          ]}
        />
        <Text style={styles.compactText}>
          {isConnected ? 'TV' : 'Nepřipojeno'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isConnected ? '#29a329' : '#d9534f' }
          ]}
        />
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>
            {isConnected ? 'Připojeno k TV' : 'Nepřipojeno k TV'}
          </Text>
          {isConnected && (
            <Text style={styles.tvInfo}>
              {connectedTVName || connectedTVIP}
            </Text>
          )}
        </View>
      </View>

      {showConnectButton && (
        <View style={styles.buttonContainer}>
          {isConnected ? (
            <TouchableOpacity 
              style={[styles.button, styles.disconnectButton]} 
              onPress={handleDisconnect}
            >
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.buttonText}>Odpojit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.connectButton]} 
              onPress={handleConnectPress}
            >
              <Ionicons name="wifi" size={16} color="#fff" />
              <Text style={styles.buttonText}>
                {connectedTVIP ? 'Připojit' : 'Najít TV'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    ...textStyles.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  tvInfo: {
    ...textStyles.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  compactText: {
    ...textStyles.caption,
    color: COLORS.textSecondary,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  connectButton: {
    backgroundColor: '#4C6EF5',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    ...textStyles.caption,
    color: '#fff',
    fontWeight: '500',
  },
});
