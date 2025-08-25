import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import COLORS from '@/app/theme/colors'
import { textStyles } from '@/app/theme/fonts'

export default function HowItWorks() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Zde vysvětlíme, jak aplikace funguje...
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
    ...textStyles.h3,
    color: COLORS.textSecondary,
  },
})
