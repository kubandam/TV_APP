import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import COLORS from './theme/colors'
import { API_BASE_URL, API_KEY, DEVICE_ID } from '@/src/config/api'
import { useTVConnection } from '@/src/TVConnectionContext'

type LogEntry = {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'channel' | 'command' | 'api'
}

export default function TVConnectionTest() {
  const { currentChannel, simulationMode } = useTVConnection()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [sending, setSending] = useState(false)
  const [config, setConfig] = useState<{ fallback_channel: number | null; original_channel: number | null }>({
    fallback_channel: null,
    original_channel: null,
  })

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/config`, {
        headers: {
          'X-API-Key': API_KEY,
          'X-Device-Id': DEVICE_ID,
        },
      })
      const data = await response.json()
      setConfig(data)
      addLog('Načítaná konfigurácia z API', 'info')
    } catch (error) {
      addLog('Chyba pri načítaní konfigurácie', 'info')
    }
  }

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
      message,
      type,
    }
    setLogs(prev => [entry, ...prev].slice(0, 50)) // Keep last 50
  }

  const sendAdDetection = async (isAd: boolean) => {
    if (sending) return
    
    setSending(true)
    addLog(`Posielam na API: ${isAd ? 'REKLAMA ZAČALA' : 'REKLAMA SKONČILA'}`, 'api')

    try {
      const response = await fetch(`${API_BASE_URL}/v1/ad-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'X-Device-Id': DEVICE_ID,
        },
        body: JSON.stringify({
          is_ad: isAd,
          confidence: 0.95,
          captured_at: new Date().toISOString(),
          payload: { source: 'simulation_test' },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.auto_switch) {
        addLog(`API vytvorilo príkaz: Prepnúť na kanál ${data.auto_switch.channel}`, 'command')
        addLog(`Dôvod: ${data.auto_switch.reason === 'ad_started' ? 'Reklama začala' : 'Reklama skončila'}`, 'info')
        addLog('Mobil dostane tento príkaz za 0.5-1s (polling)', 'info')
      } else {
        addLog('API nevytvorilo žiadny príkaz (už v správnom stave alebo chýba config)', 'info')
      }
      
      // Reload config to see updated original_channel
      await loadConfig()
    } catch (error) {
      addLog(`Chyba: ${error}`, 'info')
    } finally {
      setSending(false)
    }
  }

  // Monitor channel changes
  useEffect(() => {
    if (currentChannel) {
      addLog(`📺 PREPNUTÉ NA KANÁL ${currentChannel}`, 'channel')
    }
  }, [currentChannel])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'channel': return '📺'
      case 'command': return '📥'
      case 'api': return '🌐'
      default: return 'ℹ️'
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Späť</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Test prepínania</Text>
        <TouchableOpacity onPress={() => setLogs([])}>
          <Text style={styles.clearButton}>Vymazať</Text>
        </TouchableOpacity>
      </View>

      {/* Warning if simulation mode is off */}
      {!simulationMode && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Simulačný mód je vypnutý!{'\n'}
            Zapnite ho v Nastavenia → Simulačný mód
          </Text>
        </View>
      )}

      {/* Current Channel Display */}
      <View style={styles.channelDisplay}>
        <Text style={styles.channelLabel}>Aktuálny kanál:</Text>
        <Text style={styles.channelNumber}>{currentChannel || '–'}</Text>
      </View>

      {/* Config Display */}
      <View style={styles.configBox}>
        <Text style={styles.configTitle}>Konfigurácia:</Text>
        <Text style={styles.configText}>
          • Fallback kanál: {config.fallback_channel ?? '❌ Nenastavený'}
        </Text>
        <Text style={styles.configText}>
          • Pôvodný kanál: {config.original_channel ?? '❌ Nenastavený'}
        </Text>
        {!config.fallback_channel && (
          <Text style={styles.configWarning}>
            {'\n'}⚠️ Nastavte fallback_channel v Nastaveniach → Přepínání při reklamách
          </Text>
        )}
      </View>

      {/* Test Buttons */}
      <View style={styles.buttonSection}>
        <Text style={styles.sectionTitle}>Simulovať detekciu:</Text>
        <Text style={styles.hint}>
          Tieto tlačidlá simulujú to, čo by poslal Raspberry Pi s CLIP detekciou.
        </Text>
        
        <TouchableOpacity
          style={[styles.button, styles.adStartButton]}
          onPress={() => sendAdDetection(true)}
          disabled={sending || !config.fallback_channel}
        >
          <Text style={styles.buttonText}>🚨 REKLAMA ZAČALA</Text>
          <Text style={styles.buttonSubtext}>
            {config.fallback_channel 
              ? `Prepne na kanál ${config.fallback_channel}`
              : 'Nastavte fallback_channel'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.adEndButton]}
          onPress={() => sendAdDetection(false)}
          disabled={sending || !config.original_channel}
        >
          <Text style={styles.buttonText}>✅ REKLAMA SKONČILA</Text>
          <Text style={styles.buttonSubtext}>
            {config.original_channel
              ? `Vráti sa na kanál ${config.original_channel}`
              : 'Najprv prepnite na nejaký kanál'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View style={styles.logsSection}>
        <Text style={styles.sectionTitle}>Aktivita v reálnom čase:</Text>
        <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
          {logs.length === 0 ? (
            <Text style={styles.emptyLogs}>
              Žiadne udalosti. Stlačte tlačidlá vyššie na testovanie.
            </Text>
          ) : (
            logs.map(log => (
              <View key={log.id} style={styles.logEntry}>
                <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                <Text style={styles.logIcon}>{getLogIcon(log.type)}</Text>
                <Text style={[
                  styles.logMessage,
                  log.type === 'channel' && styles.logMessageChannel
                ]}>
                  {log.message}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Ako to funguje: Tlačidlo → API vytvorí príkaz → Mobil príjme príkaz → TV prepne kanál
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  clearButton: {
    fontSize: 14,
    color: '#d9534f',
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
  channelDisplay: {
    backgroundColor: '#FFD33D',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.textPrimary,
  },
  channelLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  channelNumber: {
    fontSize: 56,
    color: COLORS.textPrimary,
    fontWeight: '900',
  },
  configBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  configTitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
  },
  configText: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 4,
  },
  configWarning: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
    lineHeight: 18,
  },
  buttonSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  adStartButton: {
    backgroundColor: '#ff6b6b',
  },
  adEndButton: {
    backgroundColor: '#51cf66',
  },
  buttonText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  logsSection: {
    flex: 1,
    marginBottom: 12,
  },
  logsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyLogs: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
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
    fontSize: 14,
    color: '#FFD33D',
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4dabf7',
  },
  infoText: {
    fontSize: 11,
    color: '#1971c2',
    textAlign: 'center',
    lineHeight: 16,
  },
})
