import AsyncStorage from '@react-native-async-storage/async-storage';
import { StereoPair, LanguageCode } from '../types';
import { DEMO_STEREO_PAIRS } from '../constants';

const STORAGE_KEYS = {
  PROJECTS: '@spatial3d_saved_projects_v1',
  SETTINGS_LANG: '@spatial3d_settings_lang',
  SETTINGS_BASE_RULE: '@spatial3d_settings_base_rule',
  SETTINGS_HAPTICS: '@spatial3d_settings_haptics',
};

export async function loadSavedStereoPairs(): Promise<StereoPair[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      return DEMO_STEREO_PAIRS;
    }
    const parsed: StereoPair[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEMO_STEREO_PAIRS;
  } catch (err) {
    console.warn('Failed to load saved stereo pairs:', err);
    return DEMO_STEREO_PAIRS;
  }
}

export async function saveStereoPair(pair: StereoPair): Promise<void> {
  try {
    const existing = await loadSavedStereoPairs();
    const updated = [pair, ...existing.filter((p) => p.id !== pair.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save stereo pair:', err);
  }
}

export async function updateStereoPairAlignment(
  pairId: string,
  alignment: StereoPair['alignment']
): Promise<void> {
  try {
    const existing = await loadSavedStereoPairs();
    const updated = existing.map((p) => (p.id === pairId ? { ...p, alignment } : p));
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update stereo pair alignment:', err);
  }
}

export async function deleteStereoPair(pairId: string): Promise<void> {
  try {
    const existing = await loadSavedStereoPairs();
    const updated = existing.filter((p) => p.id !== pairId);
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete stereo pair:', err);
  }
}

export async function loadLanguagePreference(): Promise<LanguageCode> {
  try {
    const lang = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_LANG);
    return lang === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

export async function saveLanguagePreference(lang: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_LANG, lang);
  } catch (err) {
    console.warn('Failed to save language preference:', err);
  }
}
