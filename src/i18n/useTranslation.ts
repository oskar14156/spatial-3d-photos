import { useCallback, useSyncExternalStore } from 'react';
import type { LanguageCode } from '../types';
import {
  getLanguage,
  subscribeToLanguage,
  t as translate,
  type TranslationKey,
} from './translations';

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

/**
 * Re-renders the calling component whenever the app language changes, so a
 * language switch takes effect everywhere without remounting the tree.
 */
export function useTranslation(): { t: Translate; language: LanguageCode } {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguage,
    getLanguage
  );

  const t = useCallback<Translate>(
    (key, params) => translate(key, params),
    // `language` is the dependency that makes memoised consumers re-read.
    [language]
  );

  return { t, language };
}
