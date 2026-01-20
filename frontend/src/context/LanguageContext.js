import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation } from '../lib/translations';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('tsmarket_lang') || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('tsmarket_lang', lang);
  }, [lang]);

  const t = (path) => getTranslation(lang, path);

  const toggleLanguage = () => {
    setLang(lang === 'ru' ? 'tj' : 'ru');
  };

  const value = {
    lang,
    setLang,
    t,
    toggleLanguage,
    isRussian: lang === 'ru',
    isTajik: lang === 'tj',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
