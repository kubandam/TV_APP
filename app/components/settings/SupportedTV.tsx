import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import COLORS from '@/app/theme/colors'

export default function SupportedTV() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Aplikace funguje na Samsung Tizen OS a Android TV.
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
