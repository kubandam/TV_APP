import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import COLORS from '../theme/colors'

type ChannelButtonProps = {
  label: string
  index?: number
  selected?: boolean
  onPress: () => void
  onLongPress?: () => void
}

export default function ChannelButton({ label, index, selected = false, onPress, onLongPress }: ChannelButtonProps) {
  const fontSize = label.length > 12 ? 14 : label.length > 8 ? 18 : 22
  return (
    <TouchableOpacity
      style={[styles.button, selected ? styles.selected : styles.unselected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {typeof index === 'number' && <Text style={styles.index}>{index}.</Text>}
      <Text style={[styles.label, { fontSize }, selected ? styles.labelSelected : styles.labelUnselected]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const SIZE = 96

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    paddingHorizontal: 4, // nech má text priestor
  } as ViewStyle,
  selected: {
    backgroundColor: '#FFD33D',
    borderColor: COLORS.textPrimary,
  } as ViewStyle,
  unselected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.textPrimary,
  } as ViewStyle,
  index: {
    position: 'absolute',
    top: 6,
    left: 8,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
  } as TextStyle,
  label: {
    textAlign: 'center',
    fontWeight: '700',
  } as TextStyle,
  labelSelected: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  } as TextStyle,
  labelUnselected: {
    color: COLORS.textPrimary,
  } as TextStyle,
})
