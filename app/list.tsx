import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ChannelButton from '@/app/components/ChannelButton'
import COLORS from '@/app/theme/colors'
import { textStyles } from '@/app/theme/fonts'
import { saveSelectedChannels, loadSelectedChannels } from './storage/channels'

type Channel = { id: string; label: string }

const CHANNELS: Channel[] = [
  { id: 'stv1', label: 'STV:1' },
  { id: 'stv2', label: 'STV:2' },
  { id: 'markiza', label: 'Markíza' },
  { id: 'stvsport', label: 'STV:Sport' },
  { id: 'stv24', label: 'STV:24' },
  { id: 'ta3', label: 'TA3' },
  { id: 'tvjoj', label: 'TV Joj' },
  { id: 'jojplus', label: 'Joj Plus' },
  { id: 'jojwau', label: 'Joj Wau' },
  { id: 'joj24', label: 'Joj 24' },
]

export default function List() {
  const router = useRouter()

  // channels the user picks *now* (new additions only)
  const [selected, setSelected] = useState<string[]>([])

  // already saved on Home (we'll normalize their shape before saving)
  const [savedList, setSavedList] = useState<any[]>([])
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())

  // label->id helper (for legacy records that might not have id)
  const labelToId = useMemo(() => new Map(CHANNELS.map(c => [c.label, c.id])), [])

  useEffect(() => {
    (async () => {
      const saved = (await loadSelectedChannels()) || []
      setSavedList(saved)

      // Build set of ids already present (tolerate legacy: derive id from label)
      const ids = new Set<string>()
      for (const ch of saved) {
        const id = ch.id ?? labelToId.get(ch.label)
        if (id) ids.add(id)
      }
      setExistingIds(ids)
    })()
  }, [labelToId])

  // Only channels not already on Home
  const AVAILABLE = useMemo(
    () => CHANNELS.filter(c => !existingIds.has(c.id)),
    [existingIds]
  )

  // Temporary numbers on buttons = pick order (not persisted)
  const selectedIndexById = useMemo<Record<string, number>>(
    () => selected.reduce((acc, id, i) => ((acc[id] = i + 1), acc), {} as Record<string, number>),
    [selected]
  )

  const toggle = useCallback((id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }, [])

  const onInsert = useCallback(async () => {
    if (!selected.length) return

    // Normalize existing saved items into { id, label, appOrder, tvNumber? }
    const normalizedSaved = savedList.map((ch: any, i: number) => {
      const id = ch.id ?? labelToId.get(ch.label) ?? ch.label // last resort: label
      const appOrder = typeof ch.appOrder === 'number'
        ? ch.appOrder
        : (typeof ch.index === 'number' ? ch.index : i + 1) // support legacy "index"
      const tvNumber = typeof ch.tvNumber === 'number' ? ch.tvNumber : undefined
      return { id, label: ch.label, appOrder, tvNumber }
    })

    // Determine next appOrder start (max existing)
    const maxExistingOrder = normalizedSaved.reduce((m: number, ch: any) => Math.max(m, ch.appOrder || 0), 0)

    // Append new picks with consecutive appOrder; tvNumber left undefined (set later on Home)
    const toAppend = selected.map((id, i) => {
      const label = CHANNELS.find(c => c.id === id)?.label ?? id
      return { id, label, appOrder: maxExistingOrder + i + 1 }
    })

    const finalList = [...normalizedSaved, ...toAppend]
    await saveSelectedChannels(finalList)
    router.replace('/home')
  }, [selected, savedList, labelToId])

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={30} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.tvBox}><Text style={styles.tvText}>TV</Text></View>

        {selected.length > 0 && (
          <TouchableOpacity onPress={onInsert} style={styles.insertBtn}>
            <Text style={styles.insertBtnText}>Uložit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Vyber TV stanici/e na kterou/é chceš přepnout</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {AVAILABLE.map(ch => (
          <ChannelButton
            key={ch.id}
            label={ch.label}
            selected={selected.includes(ch.id)}
            onPress={() => toggle(ch.id)}
          />
        ))}
        {AVAILABLE.length === 0 && (
          <Text style={{ ...textStyles.body, color: COLORS.textPrimary, marginTop: 12 }}>
            Všechny dostupné stanice už máš přidané.
          </Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 20, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 30 },
  headerLeft: { height: 44, justifyContent: 'center', paddingRight: 20 },
  tvBox: { backgroundColor: COLORS.white, paddingHorizontal: 24, paddingVertical: 6, borderWidth: 2, borderColor: COLORS.textPrimary },
  tvText: { ...textStyles.h2, color: COLORS.textPrimary },
  insertBtn: { position: 'absolute', right: -20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 2, borderColor: COLORS.textPrimary, backgroundColor: '#FFD33D' },
  insertBtnText: { ...textStyles.bodyBold, color: COLORS.textPrimary },
  title: { ...textStyles.h3, color: COLORS.textPrimary, textAlign: 'center', marginVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 32, marginTop: 10 },
})
