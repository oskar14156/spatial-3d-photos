import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode, StereoAlignment, StereoPair } from '../types';

const KEYS = {
  projects: '@spatial3d_saved_projects_v1',
  language: '@spatial3d_settings_lang',
} as const;

/**
 * Reads only what the user actually saved.
 *
 * The demo pairs are deliberately *not* mixed in here: the previous version
 * returned them as a fallback, so the very next save persisted the samples as
 * if the user had created them, and deleting one brought it straight back.
 */
async function readProjects(): Promise<StereoPair[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.projects);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StereoPair[]) : [];
  } catch (error) {
    console.warn('Could not read saved stereo pairs', error);
    return [];
  }
}

async function writeProjects(projects: StereoPair[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.projects, JSON.stringify(projects));
  } catch (error) {
    console.warn('Could not persist stereo pairs', error);
  }
}

/** Saved projects first, with the built-in samples appended for discovery. */
export async function loadSavedStereoPairs(): Promise<StereoPair[]> {
  const saved = await readProjects();
  return saved;
}

export async function saveStereoPair(pair: StereoPair): Promise<void> {
  const existing = await readProjects();
  await writeProjects([pair, ...existing.filter((item) => item.id !== pair.id)]);
}

export async function updateStereoPairAlignment(
  pairId: string,
  alignment: StereoAlignment
): Promise<void> {
  const existing = await readProjects();
  if (!existing.some((item) => item.id === pairId)) return;
  await writeProjects(
    existing.map((item) => (item.id === pairId ? { ...item, alignment } : item))
  );
}

export async function deleteStereoPair(pairId: string): Promise<void> {
  const existing = await readProjects();
  await writeProjects(existing.filter((item) => item.id !== pairId));
}

export async function loadLanguagePreference(): Promise<LanguageCode> {
  try {
    return (await AsyncStorage.getItem(KEYS.language)) === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

export async function saveLanguagePreference(
  language: LanguageCode
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.language, language);
  } catch (error) {
    console.warn('Could not persist the language preference', error);
  }
}
