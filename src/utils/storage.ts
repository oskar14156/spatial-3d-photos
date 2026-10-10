import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from './log';
import {
  deletePairFiles,
  persistPairFiles,
  releaseReplacedFiles,
  restorePair,
} from './pairFiles';
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
    log.warn('Could not read saved stereo pairs', error);
    return [];
  }
}

/** Reports whether the write landed, so callers never delete files first. */
async function writeProjects(projects: StereoPair[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEYS.projects, JSON.stringify(projects));
    return true;
  } catch (error) {
    log.warn('Could not persist stereo pairs', error);
    return false;
  }
}

/**
 * Every read-modify-write of the pair list goes through this queue. Each
 * operation reads the whole list and writes it back, so two running at once —
 * an alignment nudge while an import saves — would each write a list missing
 * the other's change.
 */
let pending: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const run = pending.then(operation, operation);
  pending = run.catch(() => {});
  return run;
}

/**
 * The user's saved pairs, ready to display.
 *
 * Also repairs what earlier builds left behind: paths re-anchored to this
 * launch's data container, files still sitting in temporary storage moved out
 * of it, and records whose images the system has already purged dropped —
 * those cannot be shown, and keeping them only produced blank tiles.
 */
export function loadSavedStereoPairs(): Promise<StereoPair[]> {
  return serial(loadAndRepair);
}

async function loadAndRepair(): Promise<StereoPair[]> {
  const saved = await readProjects();
  const restored: StereoPair[] = [];
  let changed = false;

  for (const pair of saved) {
    const usable = restorePair(pair);
    if (!usable) {
      log.warn('Dropping a saved pair whose images no longer exist');
      changed = true;
      continue;
    }
    if (JSON.stringify(usable) !== JSON.stringify(pair)) changed = true;
    restored.push(usable);
  }

  if (changed) await writeProjects(restored);
  return restored;
}

/**
 * Saves a pair and returns it as stored. Its media moves out of temporary
 * storage on the way in, so callers must keep the returned pair — the one they
 * passed in now points at files that are gone.
 */
export function saveStereoPair(pair: StereoPair): Promise<StereoPair> {
  return serial(async () => {
    const stored = persistPairFiles(pair);
    const existing = await readProjects();
    const previous = existing.find((item) => item.id === stored.id);
    const written = await writeProjects([
      stored,
      ...existing.filter((item) => item.id !== stored.id),
    ]);
    // Only once the new record is safely stored: if the write failed, the old
    // record is still the saved one and still needs its files.
    if (written && previous) releaseReplacedFiles(previous, stored);
    return stored;
  });
}

export function updateStereoPairAlignment(
  pairId: string,
  alignment: StereoAlignment
): Promise<void> {
  return serial(async () => {
    const existing = await readProjects();
    if (!existing.some((item) => item.id === pairId)) return;
    await writeProjects(
      existing.map((item) => (item.id === pairId ? { ...item, alignment } : item))
    );
  });
}

export function deleteStereoPair(pairId: string): Promise<void> {
  return serial(async () => {
    const existing = await readProjects();
    const written = await writeProjects(
      existing.filter((item) => item.id !== pairId)
    );
    // A failed write leaves the record saved; keep the media it points at.
    if (written) deletePairFiles(pairId);
  });
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
    log.warn('Could not persist the language preference', error);
  }
}
