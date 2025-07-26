import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import COLORS from '@/app/theme/colors'
import { router } from 'expo-router'
import ChannelsButtons from './components/ChannelButtons'
import { Ionicons } from '@expo/vector-icons'

export default function Home() {
  const [selected, setSelected] = useState<string | null>(null)

  const selectedChannels = [
    { label: 'ČT1', index: 1 },
  ]

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
        <Ionicons
            name="settings"
            size={30}
            color={COLORS.textPrimary}
          />
      </TouchableOpacity>
      <Text style={styles.title}>Na kterou TV stanici chceš přepnout?</Text>
      <ChannelsButtons
        channels={selectedChannels}
        selected={selected}
        onSelect={setSelected}
      />

      <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/findTVs')}>
        <Text style={styles.settingsButtonText}>Najít TV (docasne)</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    padding: 30,
  },
  settingsButton: {
  },
  settingsButtonImage: {
    width: 32,
    height: 32,
  },
  title: {
    width: '80%',
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: 500,
    marginTop: 20,
  },
  settingsButtonText: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: 500,
    textDecorationLine: 'underline',
    marginTop: 20,
    fontStyle: 'italic',
  },
})
