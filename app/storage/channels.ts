import AsyncStorage from '@react-native-async-storage/async-storage'

export type SavedChannel = { id?: string; label: string; index: number }
const KEY = 'selectedChannels'

export async function saveSelectedChannels(channels: SavedChannel[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(channels))
}

export async function loadSelectedChannels(): Promise<SavedChannel[] | null> {
  const raw = await AsyncStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as SavedChannel[]) : null
}

export async function clearSelectedChannels() {
  await AsyncStorage.removeItem(KEY)
}
