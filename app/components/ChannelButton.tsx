import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native'
import COLORS from '../theme/colors'
import { textStyles } from '../theme/fonts'

type ChannelButtonProps = {
  label: string
  appOrder?: number        // NEW: order in the app grid
  tvNumber?: number        // NEW: TV channel number
  selected?: boolean
  onPress: () => void
  onLongPress?: () => void
}

export default function ChannelButton({
  label,
  appOrder,
  tvNumber,
  selected = false,
  onPress,
  onLongPress,
}: ChannelButtonProps) {
  const fontSize = label.length > 12 ? 14 : label.length > 8 ? 18 : 22

  return (
    <TouchableOpacity
      style={[styles.button, selected ? styles.selected : styles.unselected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* App order (top-left) */}
      {typeof appOrder === 'number' && (
        <Text style={styles.appOrder}>{appOrder}.</Text>
      )}

      {/* TV number (top-right pill) */}
      {typeof tvNumber === 'number' && (
        <View style={styles.tvPill}>
          <Text style={styles.tvPillText}>{tvNumber}</Text>
        </View>
      )}

      <Text
        style={[
          styles.label,
          { fontSize },
          selected ? styles.labelSelected : styles.labelUnselected,
        ]}
        numberOfLines={2}
      >
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
    paddingHorizontal: 4,
  } as ViewStyle,
  selected: {
    backgroundColor: '#FFD33D',
    borderColor: COLORS.textPrimary,
  } as ViewStyle,
  unselected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.textPrimary,
  } as ViewStyle,

  // App order number (top-left)
  appOrder: {
    position: 'absolute',
    top: 6,
    left: 8,
    ...textStyles.captionBold,
    color: COLORS.textPrimary,
  } as TextStyle,

  // TV number pill (top-right)
  tvPill: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  } as ViewStyle,
  tvPillText: {
    color: COLORS.white,
    ...textStyles.captionBold,
  } as TextStyle,

  label: {
    textAlign: 'center',
    ...textStyles.channelButton,
  } as TextStyle,
  labelSelected: {
    color: COLORS.textPrimary,
    ...textStyles.channelButton,
  } as TextStyle,
  labelUnselected: {
    color: COLORS.textPrimary,
    ...textStyles.channelButtonSmall,
  } as TextStyle,
})
