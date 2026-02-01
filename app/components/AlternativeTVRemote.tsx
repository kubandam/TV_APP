import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSamsungRemote } from '../../src/useSamsungRemote';
import COLORS from '../theme/colors';

interface AlternativeTVRemoteProps {
  tvIP: string;
  onConnectionChange?: (connected: boolean) => void;
}

export default function AlternativeTVRemote({ 
  tvIP, 
  onConnectionChange 
}: AlternativeTVRemoteProps) {
  const router = useRouter();
  const [currentChannel, setCurrentChannel] = React.useState('');
  const [volume, setVolume] = React.useState(50);
  
  const {
    sendKey,
    sendChannelNumber,
    isAuthenticated,
    isConnecting,
    pairingInProgress,
    startPairing,
  } = useSamsungRemote(tvIP);

  React.useEffect(() => {
    onConnectionChange?.(isAuthenticated);
  }, [isAuthenticated, onConnectionChange]);

  const handleChannelChange = () => {
    if (!currentChannel.trim()) {
      Alert.alert('Chyba', 'Zadejte číslo kanálu');
      return;
    }
    
    const channelNumber = parseInt(currentChannel);
    if (isNaN(channelNumber)) {
      Alert.alert('Chyba', 'Neplatné číslo kanálu');
      return;
    }
    
    sendChannelNumber(channelNumber);
    setCurrentChannel('');
  };

  const adjustVolume = (direction: 'up' | 'down') => {
    const key = direction === 'up' ? 'KEY_VOLUP' : 'KEY_VOLDOWN';
    sendKey(key);
    
    // Update local volume state
    if (direction === 'up' && volume < 100) {
      setVolume(prev => Math.min(100, prev + 5));
    } else if (direction === 'down' && volume > 0) {
      setVolume(prev => Math.max(0, prev - 5));
    }
  };

  const renderButton = (
    icon: string,
    label: string,
    onPress: () => void,
    disabled: boolean = false,
    style?: any
  ) => (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabledButton,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon as any} size={24} color={disabled ? '#999' : COLORS.textPrimary} />
      <Text style={[styles.buttonText, disabled && styles.disabledText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Dálkové ovládání TV (Alternativní)</Text>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isAuthenticated ? '#4CAF50' : pairingInProgress ? '#FFA500' : '#FF5722' }
            ]}
          />
          <Text style={styles.statusText}>
            {isConnecting ? 'Připojování...' : pairingInProgress ? 'Párování...' : isAuthenticated ? 'Připojeno' : 'Odpojeno'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connection Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Připojení</Text>
          <View style={styles.buttonRow}>
            {!isAuthenticated && !isConnecting && !pairingInProgress && (
              <TouchableOpacity style={styles.connectButton} onPress={startPairing}>
                <Ionicons name="wifi" size={20} color="white" />
                <Text style={styles.connectButtonText}>Připojit</Text>
              </TouchableOpacity>
            )}
            {pairingInProgress && (
              <Text style={styles.pairingText}>Potvrďte připojení na TV</Text>
            )}
          </View>
        </View>

        {/* Power Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Napájení</Text>
          <View style={styles.buttonRow}>
            {renderButton('power', 'Napájení', () => sendKey('KEY_POWER'), !isAuthenticated)}
          </View>
        </View>

        {/* Volume Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hlasitost</Text>
          <View style={styles.volumeDisplay}>
            <Text style={styles.volumeText}>Hlasitost: {volume}</Text>
          </View>
          <View style={styles.buttonRow}>
            {renderButton('volume-low', 'Hlas -', () => adjustVolume('down'), !isAuthenticated)}
            {renderButton('volume-high', 'Hlas +', () => adjustVolume('up'), !isAuthenticated)}
          </View>
        </View>

        {/* Channel Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kanál</Text>
          <View style={styles.channelInput}>
            <TextInput
              style={styles.input}
              placeholder="Zadejte číslo kanálu"
              value={currentChannel}
              onChangeText={setCurrentChannel}
              keyboardType="numeric"
              maxLength={3}
            />
            <TouchableOpacity
              style={[styles.goButton, !isAuthenticated && styles.disabledButton]}
              onPress={handleChannelChange}
              disabled={!isAuthenticated || !currentChannel}
            >
              <Text style={styles.goButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            {renderButton('chevron-down', 'Kanál -', () => sendKey('KEY_CHDOWN'), !isAuthenticated)}
            {renderButton('chevron-up', 'Kanál +', () => sendKey('KEY_CHUP'), !isAuthenticated)}
          </View>
        </View>

        {/* Navigation Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigace</Text>
          <View style={styles.navigationGrid}>
            <View style={styles.navRow}>
              <View style={styles.navSpacer} />
              {renderButton('chevron-up', '', () => sendKey('KEY_UP'), !isAuthenticated, styles.navButton)}
              <View style={styles.navSpacer} />
            </View>
            <View style={styles.navRow}>
              {renderButton('chevron-back', '', () => sendKey('KEY_LEFT'), !isAuthenticated, styles.navButton)}
              {renderButton('radio-button-on', 'OK', () => sendKey('KEY_ENTER'), !isAuthenticated, styles.navButton)}
              {renderButton('chevron-forward', '', () => sendKey('KEY_RIGHT'), !isAuthenticated, styles.navButton)}
            </View>
            <View style={styles.navRow}>
              <View style={styles.navSpacer} />
              {renderButton('chevron-down', '', () => sendKey('KEY_DOWN'), !isAuthenticated, styles.navButton)}
              <View style={styles.navSpacer} />
            </View>
          </View>
        </View>

        {/* Media Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Média</Text>
          <View style={styles.buttonRow}>
            {renderButton('play', 'Přehrát', () => sendKey('KEY_PLAY'), !isAuthenticated)}
            {renderButton('pause', 'Pauza', () => sendKey('KEY_PAUSE'), !isAuthenticated)}
            {renderButton('stop', 'Stop', () => sendKey('KEY_STOP'), !isAuthenticated)}
          </View>
          <View style={styles.buttonRow}>
            {renderButton('play-back', 'Přetáčet', () => sendKey('KEY_REWIND'), !isAuthenticated)}
            {renderButton('play-forward', 'Přetáčet vpřed', () => sendKey('KEY_FF'), !isAuthenticated)}
          </View>
        </View>

        {/* Additional Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Další</Text>
          <View style={styles.buttonRow}>
            {renderButton('home', 'Domů', () => sendKey('KEY_HOME'), !isAuthenticated)}
            {renderButton('return-up-back', 'Zpět', () => sendKey('KEY_RETURN'), !isAuthenticated)}
            {renderButton('menu', 'Menu', () => sendKey('KEY_MENU'), !isAuthenticated)}
          </View>
          <View style={styles.buttonRow}>
            {renderButton('color-palette', 'Červená', () => sendKey('KEY_RED'), !isAuthenticated)}
            {renderButton('color-palette', 'Zelená', () => sendKey('KEY_GREEN'), !isAuthenticated)}
            {renderButton('color-palette', 'Žlutá', () => sendKey('KEY_YELLOW'), !isAuthenticated)}
            {renderButton('color-palette', 'Modrá', () => sendKey('KEY_BLUE'), !isAuthenticated)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    margin: 4,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  disabledText: {
    color: '#999',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  pairingText: {
    fontSize: 14,
    color: '#FFA500',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  volumeDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  volumeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  channelInput: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  goButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  goButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  navigationGrid: {
    alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  navSpacer: {
    width: 80,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});
