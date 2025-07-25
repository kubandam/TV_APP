import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockChannels = ['ČT1', 'Nova Action', 'Prima', 'ČT Sport'];

export default function ChannelControlScreen() {
  const { ip, location } = useLocalSearchParams();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [channelNumber, setChannelNumber] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [savedChannels, setSavedChannels] = useState<
    Array<{ name: string; number: number }>
  >([]);
  const router = useRouter();

  // Funkcia pre uloženie kanálov do AsyncStorage
  const saveChannelsToStorage = async (
    channels: Array<{ name: string; number: number }>,
  ) => {
    try {
      const key = `tv_channels_${ip}`;
      await AsyncStorage.setItem(key, JSON.stringify(channels));
    } catch (error) {
      console.error('Chyba pri ukladaní kanálov:', error);
    }
  };

  // Funkcia pre načítanie kanálov z AsyncStorage
  const loadChannelsFromStorage = async () => {
    try {
      const key = `tv_channels_${ip}`;
      const savedChannelsData = await AsyncStorage.getItem(key);
      if (savedChannelsData) {
        const channels = JSON.parse(savedChannelsData);
        setSavedChannels(channels);
      }
    } catch (error) {
      console.error('Chyba pri načítaní kanálov:', error);
    }
  };

  // Načítanie kanálov pri načítaní komponentu
  useEffect(() => {
    loadChannelsFromStorage();
  }, [ip]);

  const handlePlusPress = () => {
    setIsModalVisible(true);
  };

  const handleChannelSelect = (channel: string) => {
    setSelectedChannel(channel);
    setChannelNumber('');
    setIsModalVisible(false);
  };

  const handleChannelPress = (channel: { name: string; number: number }) => {
    Alert.alert(
      'Prepínanie kanálu',
      `Prepínam na ${channel.name} (číslo ${channel.number})`,
      [
        {
          text: 'OK',
          onPress: () => {
            // TODO: poslať príkaz na TV pre prepínanie kanálu
            console.log(
              `Switching to channel ${channel.number} - ${channel.name}`,
            );
          },
        },
      ],
    );
  };

  const handleUpPress = () => {
    console.log('Switching to higher channel');
  };

  const handleDownPress = () => {
    console.log('Switching to lower channel');
  };

  const handleChannelOptions = (channel: { name: string; number: number }) => {
    Alert.alert(
      'Možnosti kanálu',
      `Kanál: ${channel.name} (číslo ${channel.number})`,
      [
        {
          text: 'Zrušiť',
          style: 'cancel',
        },
        {
          text: 'Upraviť',
          onPress: () => handleEditChannel(channel),
        },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: () => handleDeleteChannel(channel),
        },
      ],
    );
  };

  const handleDeleteChannel = (channelToDelete: {
    name: string;
    number: number;
  }) => {
    Alert.alert(
      'Vymazať kanál',
      `Naozaj chcete vymazať kanál ${channelToDelete.name}?`,
      [
        {
          text: 'Zrušiť',
          style: 'cancel',
        },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: () => {
            const updatedChannels = savedChannels
              .filter(
                channel =>
                  !(
                    channel.name === channelToDelete.name &&
                    channel.number === channelToDelete.number
                  ),
              )
              .sort((a, b) => a.number - b.number);
            setSavedChannels(updatedChannels);
            saveChannelsToStorage(updatedChannels);
          },
        },
      ],
    );
  };

  const handleEditChannel = (channel: { name: string; number: number }) => {
    setSelectedChannel(channel.name);
    setChannelNumber(channel.number.toString());

    // Vymazať pôvodný kanál a zoradiť zvyšok
    const updatedChannels = savedChannels
      .filter(ch => !(ch.name === channel.name && ch.number === channel.number))
      .sort((a, b) => a.number - b.number);
    setSavedChannels(updatedChannels);
    saveChannelsToStorage(updatedChannels);
  };

  const handleSaveChannel = () => {
    if (!selectedChannel || !channelNumber) {
      Alert.alert('Chyba', 'Vyberte kanál a zadajte číslo');
      return;
    }

    const number = parseInt(channelNumber);
    if (isNaN(number) || number < 1) {
      Alert.alert('Chyba', 'Zadajte platné číslo kanálu');
      return;
    }

    // Kontrola, či už kanál existuje (okrem aktuálne editovaného)
    const channelExists = savedChannels.some(
      channel =>
        (channel.name === selectedChannel &&
          channel.number !== parseInt(channelNumber)) ||
        (channel.number === number && channel.name !== selectedChannel),
    );

    if (channelExists) {
      Alert.alert('Chyba', 'Tento kanál alebo číslo už existuje');
      return;
    }

    // Pridať nový kanál do zoznamu a zoradiť podľa čísla
    const newChannels = [
      ...savedChannels,
      { name: selectedChannel, number },
    ].sort((a, b) => a.number - b.number);
    setSavedChannels(newChannels);

    // Uložiť do AsyncStorage
    saveChannelsToStorage(newChannels);

    setSelectedChannel(null);
    setChannelNumber('');
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
        <Text style={styles.title}>Na kterou TV stanici chceš přepnout?</Text>
      </View>

      <View style={styles.controlsContainer}>
        <Text style={styles.controlsTitle}>Prepínanie kanálov</Text>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleUpPress}
          >
            <Ionicons name="chevron-up" size={32} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleDownPress}
          >
            <Ionicons name="chevron-down" size={32} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.channelsGrid}>
          {savedChannels.map((channel, index) => (
            <TouchableOpacity
              key={`${channel.name}-${channel.number}`}
              style={styles.channelButton}
              onPress={() => handleChannelPress(channel)}
              onLongPress={() => handleChannelOptions(channel)}
            >
              <Text style={styles.channelButtonNumber}>{channel.number}.</Text>
              <Text style={styles.channelButtonName}>{channel.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.plusButton} onPress={handlePlusPress}>
            <Text style={styles.plusIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedChannel && (
        <View style={styles.selectedChannelContainer}>
          <Text style={styles.selectedChannelText}>
            Vybraný kanál: {selectedChannel}
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Číslo kanálu v TV:</Text>
            <TextInput
              style={styles.input}
              value={channelNumber}
              onChangeText={setChannelNumber}
              placeholder="Zadajte číslo"
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveChannel}
          >
            <Text style={styles.saveButtonText}>Uložiť</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vyber kanál:</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {mockChannels
              .filter(
                channel => !savedChannels.some(saved => saved.name === channel),
              )
              .map((channel, index) => (
                <TouchableOpacity
                  key={channel}
                  style={styles.channelItem}
                  onPress={() => handleChannelSelect(channel)}
                >
                  <Text style={styles.channelNumber}>{index + 1}.</Text>
                  <Text style={styles.channelName}>{channel}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 20,
  },
  channelButton: {
    width: 120,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  channelButtonNumber: {
    position: 'absolute',
    top: 5,
    left: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  channelButtonName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  plusButton: {
    width: 120,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  plusIcon: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedChannelContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedChannelText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  channelNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
    minWidth: 20,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  controlsContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
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
    minWidth: 100,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 5,
  },
});
