import React from 'react'
import { View, StyleSheet } from 'react-native'
import ChannelButton from './ChannelButton'

type ChannelsButtonsProps = {
  channels: {
    label: string
    index: number
  }[]
  selected: string | null
  onSelect: (label: string) => void
}

export default function ChannelsButtons({
  channels,
  selected,
  onSelect,
}: ChannelsButtonsProps) {
  return (
    <View style={styles.channelButtonsContainer}>
        <ChannelButton
          key={`+`}
          index={0}
          label={'+'}
          selected={selected === '+'}
          onPress={() => onSelect('+')}
        />
      {channels.map((channel, i) => (
        <ChannelButton
          key={`${channel.label}-${i}`}
          index={channel.index}
          label={channel.label}
          selected={selected === channel.label}
          onPress={() => onSelect(channel.label)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({

    channelButtonsContainer: {
        marginTop: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
})
