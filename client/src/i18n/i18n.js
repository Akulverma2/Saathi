import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import ur from './ur.json';

i18n.use(initReactI18next).init({
  resources: { 
    en: { translation: en }, 
    hi: { translation: hi }, 
    ur: { translation: ur }
  },
  lng: localStorage.getItem('saathi_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
