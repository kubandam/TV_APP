import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import COLORS from '@/app/theme/colors';
import { textStyles } from '@/app/theme/fonts';
import { useTVConnection } from '@/src/TVConnectionContext';

export default function SimulationMode() {
  const {
    simulationMode,
    setSimulationMode,
    simulationLogs,
  } = useTVConnection();

  const handleToggle = async (value: boolean) => {
    await setSimulationMode(value);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'channel_switch': return '📺';
      case 'command_received': return '📥';
      case 'connection': return '🔌';
      default: return 'ℹ️';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Simulačný mód testuje prepínanie kanálov bez Raspberry Pi.
        Keď je zapnutý, príkazy z API sa automaticky vykonávajú.
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

      <View style={[
        styles.statusBox,
        { backgroundColor: simulationMode ? '#d4edda' : '#f8f9fa' }
      ]}>
        <Text style={[
          styles.statusText,
          { color: simulationMode ? '#155724' : '#6c757d' }
        ]}>
          {simulationMode ? '✅ Simulácia zapnutá - príkazy sa vykonávajú' : '⏸️ Simulácia vypnutá'}
        </Text>
      </View>

      {simulationMode && (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 Ako to funguje:</Text>
            <Text style={styles.infoText}>
              1. API vytvára príkazy (switch_channel){'\n'}
              2. Aplikácia ich polluje každých 500ms{'\n'}
              3. Keď dostane príkaz, prepne kanál{'\n'}
              4. Všetko sa zaznamenáva do logu nižšie
            </Text>
          </View>

          <View style={styles.logSection}>
            <Text style={styles.logTitle}>📝 Log príkazov (posledných 10)</Text>
            <Text style={styles.logHint}>
              Tu sa zobrazujú všetky príkazy, ktoré aplikácia prijala a vykonala.
            </Text>
            
            <View style={styles.logsContainer}>
              {simulationLogs.length === 0 ? (
                <Text style={styles.emptyLogs}>
                  Žiadne príkazy zatiaľ. Počkajte na detekciu reklamy...
                </Text>
              ) : (
                <ScrollView style={styles.logsScroll} showsVerticalScrollIndicator={false}>
                  {simulationLogs.slice(0, 10).map(log => (
                    <View key={log.id} style={styles.logEntry}>
                      <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                      <Text style={styles.logIcon}>{getLogIcon(log.type)}</Text>
                      <Text style={[
                        styles.logMessage,
                        log.type === 'channel_switch' && styles.logMessageChannel
                      ]}>
                        {log.message}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              📝 Poznámka: Pre testovanie môžete v API monitore manuálne odoslať
              detekciu reklamy (ad_started/ad_ended) a sledovať reakciu tu v logu.
            </Text>
          </View>
        </>
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
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    marginBottom: 24,
    borderRadius: 8,
  },
  statusText: {
    ...textStyles.body,
    fontWeight: '600',
    textAlign: 'center',
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
  logSection: {
    marginBottom: 20,
  },
  logTitle: {
    ...textStyles.h4,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  logHint: {
    ...textStyles.caption,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  logsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  logsScroll: {
    maxHeight: 380,
  },
  emptyLogs: {
    ...textStyles.body,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 40,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  logTime: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
    marginRight: 8,
    width: 60,
  },
  logIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  logMessage: {
    flex: 1,
    fontSize: 12,
    color: '#ddd',
    lineHeight: 18,
  },
  logMessageChannel: {
    fontSize: 13,
    color: '#FFD33D',
    fontWeight: '700',
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
