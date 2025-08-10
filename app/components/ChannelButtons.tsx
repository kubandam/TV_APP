import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import ChannelButton from './ChannelButton'
import { router } from 'expo-router'
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'

type Item = { key: string; label: string; index?: number; isPlus?: boolean }

type ChannelsButtonsProps = {
  channels: { label: string; index: number }[]
  selectedSet: Set<string>
  onToggleSelect: (label: string) => void
  onReorder: (items: { label: string; index: number }[]) => void
}

export default function ChannelsButtons({
  channels,
  selectedSet,
  onToggleSelect,
  onReorder,
}: ChannelsButtonsProps) {
  // data pre draglist (bez “+”)
  const data: Item[] = useMemo(
    () => channels.map((c, i) => ({ key: `${c.label}-${i}`, label: c.label, index: c.index })),
    [channels]
  )

  const renderItem = ({ item, drag }: RenderItemParams<Item>) => (
    <View style={styles.itemWrap}>
      <ChannelButton
        index={item.index}
        label={item.label}
        selected={selectedSet.has(item.label)}
        onPress={() => onToggleSelect(item.label)}
        onLongPress={drag as any}
      />
    </View>
  )

  return (
    <View style={styles.container}>
      {/* “+” pevne na začiatku */}
      <ChannelButton label="+" onPress={() => router.push('/list')} />

      {/* dragovateľné kanály */}
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        numColumns={3} // max 3 v riadku
        contentContainerStyle={styles.grid}
        onDragEnd={({ data }) => {
          const cleaned = data.map((it, i) => ({ label: it.label, index: i + 1 }))
          onReorder(cleaned)
        }}
        activationDistance={8}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 70, justifyContent: 'center', alignItems: 'center' },
  grid: { paddingTop: 10 },
  itemWrap: { margin: 4 },
})
