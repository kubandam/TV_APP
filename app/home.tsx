import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import COLORS from '@/app/theme/colors'
import { router } from 'expo-router'
import ChannelsButtons from './components/ChannelButtons'
import { Ionicons } from '@expo/vector-icons'
import { loadSelectedChannels, saveSelectedChannels, SavedChannel } from './storage/channels'

export default function Home() {
  const [channels, setChannels] = useState<SavedChannel[]>([])
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())

  useEffect(() => {
    (async () => {
      const saved = await loadSelectedChannels()
      if (saved?.length) setChannels(saved)
    })()
  }, [])

  const viewChannels = useMemo(
    () => channels.map(c => ({ label: c.label, index: c.index })),
    [channels]
  )

  const persist = async (list: SavedChannel[]) => {
    const normalized = list.map((c, i) => ({ ...c, index: i + 1 }))
    setChannels(normalized)
    await saveSelectedChannels(normalized)
  }

  const toggleSelect = (label: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const handleDelete = async () => {
    if (!selectedForDelete.size) return
    const next = channels.filter(c => !selectedForDelete.has(c.label))
    setSelectedForDelete(new Set())
    await persist(next)
  }

  const handleReorder = async (reordered: { label: string; index: number }[]) => {
    const next: SavedChannel[] = reordered.map((c, i) => ({ label: c.label, index: i + 1 }))
    await persist(next)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* centered settings */}
        <Ionicons name="settings" size={30} color={COLORS.textPrimary} onPress={() => router.push('/settings')} />

        {/* right-aligned Delete */}
        {selectedForDelete.size > 0 && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteText}>Smazat</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Na kterou TV stanici chceš přepnout?</Text>

      <TouchableOpacity onPress={() => router.push('/findTVs')}>
        <Text style={styles.settingsButtonText}>Najít TV (dočasně)</Text>
      </TouchableOpacity>
      <ChannelsButtons
        channels={viewChannels}
        selectedSet={selectedForDelete}
        onToggleSelect={toggleSelect}
        onReorder={handleReorder}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', padding: 30 },
  header: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    right: 0,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    backgroundColor: '#FFD33D',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  deleteText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 16 },
  title: {
    width: '80%', fontSize: 20, color: COLORS.textPrimary, textAlign: 'center',
    fontWeight: '500', marginTop: 20,
  },
  settingsButtonText: {
    fontSize: 20, color: COLORS.textPrimary, fontWeight: '500',
    textDecorationLine: 'underline', marginTop: 20, fontStyle: 'italic',
  },
})
