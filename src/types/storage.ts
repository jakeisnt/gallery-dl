/**
 * Chrome storage types
 */

export interface ArenaSettings {
  accessToken: string;
}

export const DEFAULT_ARENA_SETTINGS: ArenaSettings = {
  accessToken: '',
};

export async function getArenaSettings(): Promise<ArenaSettings> {
  const result = await chrome.storage.sync.get(DEFAULT_ARENA_SETTINGS);
  return result as ArenaSettings;
}

export async function setArenaSettings(settings: Partial<ArenaSettings>): Promise<void> {
  await chrome.storage.sync.set(settings);
}
