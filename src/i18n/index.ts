import { useAppStore } from '../store';
import { getTranslation, type TranslationKey } from './locales';

export type { Language, TranslationKey } from './locales';

/**
 * Hook that returns a translation function bound to the current language.
 * Usage: const t = useT(); t('header.title')
 */
export function useT() {
  const language = useAppStore((s) => s.language);
  return (key: TranslationKey) => getTranslation(language, key);
}
