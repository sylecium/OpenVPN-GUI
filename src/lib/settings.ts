export interface AppSettings {
  autoConnect: boolean;
}

const SETTINGS_KEY = "openvpn-gui-settings";
const LAST_PROFILE_KEY = "last-used-profile";

const DEFAULT_SETTINGS: AppSettings = {
  autoConnect: false,
};

export function getSettings(): AppSettings {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  const settings = getSettings();
  settings[key] = value;
  saveSettings(settings);
}

export function getLastUsedProfile(): string | null {
  return localStorage.getItem(LAST_PROFILE_KEY);
}

export function setLastUsedProfile(path: string): void {
  localStorage.setItem(LAST_PROFILE_KEY, path);
}
