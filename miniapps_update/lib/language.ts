export type Language = 'en' | 'ru' | 'kk';

export function getStoredLanguage(): Language {
  const stored = typeof window === 'undefined' ? null : localStorage.getItem('language');
  return stored === 'en' || stored === 'ru' ? stored : 'kk';
}
