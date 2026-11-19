import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppLanguage } from '../types';
import {
  TRANSLATIONS,
  applyDocumentLanguage,
  getStoredLanguage,
} from '../utils/i18n';

interface LanguageContextValue {
  lang: AppLanguage;
  isRtl: boolean;
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  t: (typeof TRANSLATIONS)['ar'] | (typeof TRANSLATIONS)['en'];
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ar',
  isRtl: true,
  setLang: () => {},
  toggleLang: () => {},
  t: TRANSLATIONS.ar,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<AppLanguage>(() => getStoredLanguage());

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const setLang = (next: AppLanguage) => {
    setLangState(next);
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        isRtl: lang === 'ar',
        setLang,
        toggleLang,
        t: TRANSLATIONS[lang],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
