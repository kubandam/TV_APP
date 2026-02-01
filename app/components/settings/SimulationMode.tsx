import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';
import { useTVConnection } from '@/src/TVConnectionContext';

export default function SimulationMode() {
  const {
    simulationMode,
    setSimulationMode,
    isConnected,
    connectedTVName,
  } = useTVConnection();

  const handleToggle = async (value: boolean) => {
    await setSimulationMode(value);
  };

  const openTest = () => {
    router.push('/tv-connection-test');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Simulačný mód umožňuje testovať prepínanie kanálov bez Raspberry Pi.
        Aplikácia sa správa, ako keby bola pripojená na TV.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Simulačný mód</Text>
        <Switch
          value={simulationMode}
          onValueChange={handleToggle}
          trackColor={{ false: '#ccc', true: '#FFD33D' }}
          thumbColor={COLORS.white}
        />
      </View>

      <View style={styles.statusBox}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected || simulationMode ? '#29a329' : '#d9534f' },
            ]}
          />
          <Text style={styles.statusText}>
            {simulationMode
              ? `Simulácia: ${connectedTVName}`
              : isConnected
              ? `Pripojené: ${connectedTVName}`
              : 'Nepripojené k TV'}
          </Text>
        </View>
      </View>

      {simulationMode && (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>✅ Simulačný mód zapnutý</Text>
            <Text style={styles.infoText}>
              Aplikácia je teraz v simulačnom móde. Na hlavnej obrazovke môžete prepínať kanály,
              aj keď nie ste pripojení na skutočnú TV.
            </Text>
          </View>

          <TouchableOpacity style={styles.testButton} onPress={openTest}>
            <Text style={styles.testButtonText}>🧪 Otvoriť test prepínania</Text>
            <Text style={styles.testButtonSubtext}>
              Test automatického prepínania kanálov cez API príkazy
            </Text>
          </TouchableOpacity>

          <View style={styles.howItWorksBox}>
            <Text style={styles.howItWorksTitle}>💡 Ako testovať:</Text>
            <Text style={styles.howItWorksText}>
              1. Nastavte fallback_channel v sekcii "Přepínání při reklamách"{'\n'}
              2. Prepnite na nejaký kanál na hlavnej obrazovke{'\n'}
              3. Otvorte test prepínania{'\n'}
              4. Stlačte tlačidlá na simuláciu začiatku/konca reklamy{'\n'}
              5. Sledujte, ako sa kanály automaticky prepínajú
            </Text>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              📝 Poznámka: V simulačnom móde sa pri prepnutí kanála zobrazí alert namiesto
              skutočného prepnutia TV. Celý systém funguje rovnako ako s reálnou TV.
            </Text>
          </View>
        </>
      )}

      {!simulationMode && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Simulačný mód vypnutý</Text>
          <Text style={styles.infoText}>
            Zapnite simulačný mód na testovanie systému automatického prepínania kanálov
            bez potreby Raspberry Pi.
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
  statusBox: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    marginBottom: 24,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    ...textStyles.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e7f5ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4dabf7',
    marginBottom: 20,
  },
  infoTitle: {
    ...textStyles.h4,
    color: '#1971c2',
    marginBottom: 8,
  },
  infoText: {
    ...textStyles.body,
    color: '#1971c2',
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#FFD33D',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 3,
    borderColor: COLORS.textPrimary,
    borderRadius: 12,
    marginBottom: 20,
  },
  testButtonText: {
    ...textStyles.button,
    color: COLORS.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 4,
  },
  testButtonSubtext: {
    ...textStyles.caption,
    color: COLORS.textPrimary,
    textAlign: 'center',
    opacity: 0.8,
  },
  howItWorksBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 20,
  },
  howItWorksTitle: {
    ...textStyles.h4,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  howItWorksText: {
    ...textStyles.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  noteBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  noteText: {
    ...textStyles.caption,
    color: '#856404',
    lineHeight: 18,
  },
});
