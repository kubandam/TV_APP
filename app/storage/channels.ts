import AsyncStorage from '@react-native-async-storage/async-storage'

export type SavedChannel = { label: string; appOrder: number; tvNumber?: number, id?: string }
const KEY = 'selected_channels'
      
export async function loadSelectedChannels(): Promise<SavedChannel[]> {
  const v2 = await AsyncStorage.getItem(KEY)
  if (v2) return JSON.parse(v2)

  return []
}

export async function saveSelectedChannels(list: SavedChannel[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list))
}
export async function clearSelectedChannels() {
  await AsyncStorage.removeItem(KEY)
}
