import { Directory, File, Paths } from 'expo-file-system';
import type { StereoPair } from '../types';
import { log } from './log';

/**
 * Where a pair's media lives once it belongs to the library.
 *
 * Captures, split eyes and imported originals are all produced in the
 * temporary directory, and the library used to keep pointing there. iOS purges
 * that directory whenever the app has been out of use for a while, so pairs
 * vanished a few days after they were made. Everything the library refers to
 * now moves under Documents, which the system never clears.
 */
const STORE = 'pairs';

const FILE_KEYS = ['leftUri', 'rightUri', 'originalUri'] as const;
type FileKey = (typeof FILE_KEYS)[number];

function storeRoot(): Directory {
  return new Directory(Paths.document, STORE);
}

/**
 * Pair ids embed whatever produced them — a capture's file path, a PHAsset
 * identifier with slashes in it — so they cannot be used as a folder name
 * verbatim. The tail carries the unique part in every case.
 */
function folderName(id: string): string {
  // Sanitising alone could map two ids onto one folder (`a/b` and `a?b`); a
  // hash of the untouched id keeps them apart.
  let hash = 5381;
  for (let index = 0; index < id.length; index += 1) {
    hash = ((hash << 5) + hash + id.charCodeAt(index)) >>> 0;
  }
  return `${id.replace(/[^A-Za-z0-9_-]/g, '_').slice(-80)}-${hash.toString(36)}`;
}

function pairFolder(id: string): Directory {
  return new Directory(storeRoot(), folderName(id));
}

function isLocalFile(uri: string | undefined): uri is string {
  return !!uri && uri.startsWith('file://');
}

/**
 * Re-anchors a stored path to this launch's Documents directory.
 *
 * iOS is free to move the app's data container when the app is updated, so an
 * absolute path saved by one build can point nowhere in the next. Anything that
 * was inside the store is rebuilt from its path relative to the store.
 */
function rebase(uri: string | undefined): string | undefined {
  if (!isLocalFile(uri)) return uri;
  const marker = `/Documents/${STORE}/`;
  const at = uri.indexOf(marker);
  if (at === -1) return uri;
  return new File(storeRoot(), uri.slice(at + marker.length)).uri;
}

function exists(uri: string | undefined): boolean {
  if (!isLocalFile(uri)) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Moves every temporary file a pair refers to into its own folder in the store
 * and returns the pair with the new locations. Files already in the store are
 * left alone, so this is safe to run on every load.
 *
 * If a move fails — a full disk, most likely — the files not yet moved stay
 * where they are, the pair names each file wherever it now actually is, and
 * the next load tries again.
 */
export function persistPairFiles(pair: StereoPair): StereoPair {
  const root = storeRoot().uri;
  const pending = FILE_KEYS.filter((key) => {
    const uri = pair[key];
    return isLocalFile(uri) && !uri.startsWith(root) && exists(uri);
  });
  if (!pending.length) return pair;

  // Kept outside the `try`: if a later move fails, the files that did move
  // are already gone from their old paths, so the pair returned must name
  // where they went.
  const next: StereoPair = { ...pair };
  try {
    const folder = pairFolder(pair.id);
    folder.create({ intermediates: true, idempotent: true });

    // One temporary file can back more than one key; move it once.
    const moved = new Map<string, string>();

    for (const key of pending) {
      const uri = pair[key] as string;
      const already = moved.get(uri);
      if (already) {
        next[key] = already;
        continue;
      }
      const source = new File(uri);
      const target = new File(folder, `${key}-${source.name}`);
      if (target.exists) target.delete();
      source.move(target);
      moved.set(uri, target.uri);
      next[key] = target.uri;
    }
    return next;
  } catch (error) {
    log.warn('Could not move a pair into permanent storage', error);
    return next;
  }
}

/**
 * Prepares a saved pair for use in this launch: re-anchors stored paths, and
 * reports `undefined` when the eye images no longer exist, which is the case
 * for anything saved before pairs were moved out of temporary storage and
 * since purged.
 */
export function restorePair(pair: StereoPair): StereoPair | undefined {
  const rebased: StereoPair = { ...pair };
  for (const key of FILE_KEYS) {
    (rebased as Record<FileKey, string | undefined>)[key] = rebase(pair[key]);
  }
  if (!exists(rebased.leftUri) || !exists(rebased.rightUri)) return undefined;
  return persistPairFiles(rebased);
}

/**
 * Deletes the stored files a replaced version of a pair referred to and the new
 * version no longer does — re-importing the same photo reuses its id, and the
 * earlier eyes would otherwise stay in the folder for good.
 */
export function releaseReplacedFiles(
  previous: StereoPair,
  current: StereoPair
): void {
  const root = storeRoot().uri;
  const kept = new Set(FILE_KEYS.map((key) => current[key]));
  for (const key of FILE_KEYS) {
    const uri = previous[key];
    if (!isLocalFile(uri) || !uri.startsWith(root) || kept.has(uri)) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (error) {
      log.warn('Could not delete a replaced pair file', error);
    }
  }
}

export function deletePairFiles(id: string): void {
  try {
    const folder = pairFolder(id);
    if (folder.exists) folder.delete();
  } catch (error) {
    log.warn('Could not delete the files of a removed pair', error);
  }
}
