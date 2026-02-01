import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';
import { getDeviceConfig, updateDeviceConfig, DeviceConfig } from '@/src/api/config';

export default function AdSwitchSettings() {
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getDeviceConfig();
      setConfig(data);
      setFallbackInput(data.fallback_channel?.toString() || '');
    } catch (error) {
      console.error('Failed to load config:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst nastavení.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const channelNum = parseInt(fallbackInput, 10);
    if (fallbackInput && (isNaN(channelNum) || channelNum < 1 || channelNum > 9999)) {
      Alert.alert('Chyba', 'Zadejte platné číslo kanálu (1-9999).');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateDeviceConfig({
        fallback_channel: fallbackInput ? channelNum : undefined,
      });
      setConfig(updated);
      Alert.alert('Uloženo', 'Nastavení bylo uloženo.');
    } catch (error) {
      console.error('Failed to save config:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit nastavení.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    try {
      setSaving(true);
      const updated = await updateDeviceConfig({
        auto_switch_enabled: value,
      });
      setConfig(updated);
    } catch (error) {
      console.error('Failed to update config:', error);
      Alert.alert('Chyba', 'Nepodařilo se změnit nastavení.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Když CLIP na Raspberry Pi detekuje reklamu, TV se automaticky přepne na náhradní kanál.
        Po skončení reklamy se vrátí na původní kanál.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Automatické přepínání</Text>
        <Switch
          value={config?.auto_switch_enabled ?? true}
          onValueChange={handleToggle}
          disabled={saving}
          trackColor={{ false: '#ccc', true: '#FFD33D' }}
          thumbColor={COLORS.white}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Náhradní kanál (při reklamě)</Text>
        <TextInput
          style={styles.input}
          value={fallbackInput}
          onChangeText={setFallbackInput}
          keyboardType="number-pad"
          placeholder="Např. 2"
          placeholderTextColor={COLORS.textSecondary}
          maxLength={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Ukládám...' : 'Uložit'}
        </Text>
      </TouchableOpacity>

      {config && (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Aktuální nastavení:</Text>
          <Text style={styles.statusText}>
            Náhradní kanál: {config.fallback_channel ?? 'Nenastaveno'}
          </Text>
          <Text style={styles.statusText}>
            Původní kanál: {config.original_channel ?? 'Nenastaveno'}
          </Text>
          <Text style={styles.statusText}>
            Auto-switch: {config.auto_switch_enabled ? 'Zapnuto' : 'Vypnuto'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  description: {
    ...textStyles.body,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  label: {
    ...textStyles.h4,
    color: COLORS.textPrimary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: '#FFD33D',
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...textStyles.button,
    color: COLORS.textPrimary,
  },
  statusBox: {
    marginTop: 30,
    padding: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  statusTitle: {
    ...textStyles.h4,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  statusText: {
    ...textStyles.body,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});
