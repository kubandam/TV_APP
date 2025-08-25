import React, { useMemo, useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import ChannelButton from './ChannelButton'
import { router } from 'expo-router'
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist'
import BottomNumberSheet from './BottomNumberSheet'

type Channel = { label: string; appOrder: number; tvNumber?: number }
type Item = { key: string; label: string; appOrder: number; tvNumber?: number }

type ChannelsButtonsProps = {
  channels: Channel[]
  selectedSet: Set<string>
  onToggleSelect: (label: string) => void
  /** updates only the app order after drag */
  onReorder: (order: { label: string; appOrder: number }[]) => void
  /** optional: when you want to send the channel to TV */
  onChannelPress?: (tvNumber: number) => void
  /** persist tvNumber with the channel */
  onSetTvNumber: (label: string, tvNumber: number) => void
  onRemoveChannel: (label: string) => void  
}

export default function ChannelsButtons({
  channels,
  selectedSet,
  onToggleSelect,
  onReorder,
  onChannelPress,
  onSetTvNumber,
  onRemoveChannel,
}: ChannelsButtonsProps) {
  const data: Item[] = useMemo(
    () => channels
      .sort((a, b) => a.appOrder - b.appOrder)
      .map((c, i) => ({
        key: `${c.label}-${i}`,
        label: c.label,
        appOrder: c.appOrder,
        tvNumber: c.tvNumber,
      })),
    [channels]
  )

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<{ label: string; value: string } | null>(null)

  const openNumberSheet = (label: string, current?: number) => {
    setEditing({ label, value: current ? String(current) : '' })
    setSheetOpen(true)
  }

  const handleSaveNumber = (raw: string) => {
    const trimmed = raw.trim()
    const n = Number(trimmed)
    if (!trimmed || !Number.isFinite(n) || n <= 0) {
      Alert.alert('Neplatné číslo', 'Zadejte prosím kladné číslo kanálu.')
      return
    }
    if (!editing) return
    onSetTvNumber(editing.label, Math.floor(n))
    setSheetOpen(false)
    setEditing(null)
  }

  
  const renderItem = ({ item, drag }: RenderItemParams<Item>) => (
    <View style={styles.itemWrap}>
      <ChannelButton
        appOrder={item.appOrder}
        tvNumber={item.tvNumber}
        label={item.label}
        selected={selectedSet.has(item.label)}
        onPress={() => {
          if (selectedSet.size > 0) {
            onToggleSelect(item.label)
          } else {
            // Open sheet to set TV number
            openNumberSheet(item.label, item.tvNumber)
            // If you also want to send immediately when tvNumber exists:
            // if (onChannelPress && item.tvNumber) onChannelPress(item.tvNumber)
          }
        }}
        onLongPress={drag as any}
      />
    </View>
  )

  return (
    <View style={styles.container}>
      {/* “+” fixed at the beginning */}
      <ChannelButton label="+" onPress={() => router.push('/list')} />

      {/* draggable channels */}
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={styles.grid}
        onDragEnd={({ data }) => {
          // Recompute app order from visual order (1-based)
          const next = data.map((it, i) => ({ label: it.label, appOrder: i + 1 }))
          onReorder(next)
        }}
        activationDistance={8}
      />

      <BottomNumberSheet
        visible={sheetOpen}
        channelLabel={editing?.label}
        defaultValue={editing?.value}
        onSave={handleSaveNumber}
        onRemove={() => {
            if (editing?.label) {
            onRemoveChannel(editing.label);
            setSheetOpen(false);
            setEditing(null);
          }
        }}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 70, justifyContent: 'center', alignItems: 'center' },
  grid: { paddingTop: 10 },
  itemWrap: { margin: 4 },
})
