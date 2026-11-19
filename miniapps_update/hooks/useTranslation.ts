import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { getStoredLanguage, type Language } from '../lib/language';

// Import translation files
import enTranslations from '../locales/en.json';
import ruTranslations from '../locales/ru.json';
import kkTranslations from '../locales/kk.json';

const translations = {
  en: enTranslations,
  ru: ruTranslations,
  kk: kkTranslations
};

export type { Language } from '../lib/language';

export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>('kk'); // Изменено на казахский по умолчанию

  useEffect(() => {
    setLanguage(getStoredLanguage());
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLanguage);
      void apiClient.syncNotificationLanguage().catch(console.warn);
    }
  };

  const t = (key: keyof typeof enTranslations): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return {
    language,
    changeLanguage,
    t
  };
};