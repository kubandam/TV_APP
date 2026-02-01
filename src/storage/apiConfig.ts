import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAST_COMMAND_ID: 'last_command_id',
} as const;

/**
 * Load last command ID from storage
 */
export async function loadLastCommandId(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.LAST_COMMAND_ID);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('Failed to load last command ID:', error);
    return 0;
  }
}

/**
 * Save last command ID to storage
 */
export async function saveLastCommandId(id: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_COMMAND_ID, id.toString());
  } catch (error) {
    console.error('Failed to save last command ID:', error);
  }
}
