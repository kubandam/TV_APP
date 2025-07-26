import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import COLORS from '@/app/theme/colors'

export default function ConnectionStatus() {
  // v praxi by si sem doplnil stav z Bluetooth/Wi-Fi API
  const isConnected = false
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isConnected
          ? 'Propojeno s TV Samsung 7'
          : 'Nepropojeno s TV'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,

  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: 400,
  },
})
