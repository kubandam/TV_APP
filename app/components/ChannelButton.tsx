// components/ChannelButton.tsx
import React from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native'
import COLORS from '../theme/colors'

type ChannelButtonProps = {
  /** Čokoľvek, čo chcete zobraziť uprostred (napr. "ČT1", "+") */
  label: string
  /** Pořadové číslo, které se ukáže v levém rohu */
  index?: number
  /** Označuje, či je tlačítko právě vybrané */
  selected?: boolean
  /** Volá sa pri tapnutí */
  onPress: () => void
}

export default function ChannelButton({
  label,
  index,
  selected = false,
  onPress,
}: ChannelButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        selected ? styles.selected : styles.unselected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {typeof index === 'number' && (
        <Text style={styles.index}>{index}.</Text>
      )}
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelUnselected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const SIZE = 90

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    position: 'relative',
  } as ViewStyle,
  selected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.textPrimary,    
  } as ViewStyle,
  unselected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.textPrimary,
  } as ViewStyle,
  index: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  } as TextStyle,
  label: {
    fontSize: 24,
  } as TextStyle,
  labelSelected: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  } as TextStyle,
  labelUnselected: {
    color: COLORS.textPrimary,
  } as TextStyle,
})
