import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ChannelButton from '@/app/components/ChannelButton'
import COLORS from '@/app/theme/colors'
import { saveSelectedChannels, loadSelectedChannels } from './storage/channels'

type Channel = { id: string; label: string }

const CHANNELS: Channel[] = [
  { id: 'ct1', label: 'ČT1' },
  { id: 'ct2', label: 'ČT2' },
  { id: 'ct24', label: 'ČT24' },
  { id: 'ctd', label: 'ČT :D' },
  { id: 'ctart', label: 'ČT ART' },
  { id: 'ctsport', label: 'ČT Sport' },
  { id: 'nova', label: 'Nova' },
  { id: 'novacinema', label: 'Nova Cinema' },
  { id: 'novaaction', label: 'Nova Action' },
  { id: 'novafun', label: 'Nova Fun' },
  { id: 'novagold', label: 'Nova Gold' },
  { id: 'novalady', label: 'Nova Lady' },
  { id: 'ns1', label: 'Nova Sport 1' },
  { id: 'ns2', label: 'Nova Sport 2' },
  { id: 'ns3', label: 'Nova Sport 3' },
  { id: 'ns4', label: 'Nova Sport 4' },
  { id: 'ns5', label: 'Nova Sport 5' },
  { id: 'ns6', label: 'Nova Sport 6' },
  { id: 'ns7', label: 'Nova Sport 7' },
  { id: 'ns8', label: 'Nova Sport 8' },
  { id: 'ns9', label: 'Nova Sport 9' },
]

export default function List() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  // Po načítaní obrazovky načítame uložené stanice
  useEffect(() => {
    (async () => {
      const saved = await loadSelectedChannels()
      console.log('saved', saved)
      if (saved && saved.length) {
        setSelected(saved.map(ch => ch.id).filter((id): id is string => id !== undefined)) // uložené id-čka
      }
    })()
  }, [])

  // indexy pre zobrazenie poradia
  const selectedIndexById = useMemo<Record<string, number>>(
    () =>
      selected.reduce((acc, id, i) => {
        acc[id] = i + 1
        return acc
      }, {} as Record<string, number>),
    [selected]
  )

  const toggle = useCallback((id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const onInsert = useCallback(async () => {
    const payload = selected.map((id, i) => {
      const label = CHANNELS.find(c => c.id === id)?.label ?? id
      return { id, label, index: i + 1 }
    })

    try {
      await saveSelectedChannels(payload)
      router.replace('/home')
    } catch (e) {
      console.warn('Saving channels failed', e)
    }
  }, [selected])

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={30} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.tvBox}>
          <Text style={styles.tvText}>TV</Text>
        </View>

        {selected.length > 0 && (
          <TouchableOpacity onPress={onInsert} style={styles.insertBtn}>
            <Text style={styles.insertBtnText}>Uložit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Vyber TV stanici/e na kterou/é chceš přepnout</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {CHANNELS.map(ch => (
          <ChannelButton
            key={ch.id}
            label={ch.label}
            selected={selected.includes(ch.id)}
            index={selectedIndexById[ch.id]}
            onPress={() => toggle(ch.id)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 30,
  },
  headerLeft: {
    height: 44,
    justifyContent: 'center',
    paddingRight: 20,
  },
  tvBox: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  tvText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '600',
  },
  insertBtn: {
    position: 'absolute',
    right: -20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
    backgroundColor: '#FFD33D',
  },
  insertBtnText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  title: {
    fontSize: 21,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginVertical: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 32,
    marginTop: 10,
  },
})
