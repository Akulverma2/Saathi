import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import ur from './ur.json';
import bn from './bn.json';
import te from './te.json';
import ta from './ta.json';
import mr from './mr.json';
import gu from './gu.json';
import kn from './kn.json';

i18n.use(initReactI18next).init({
  resources: { 
    en: { translation: en }, 
    hi: { translation: hi }, 
    ur: { translation: ur },
    bn: { translation: bn },
    te: { translation: te },
    ta: { translation: ta },
    mr: { translation: mr },
    gu: { translation: gu },
    kn: { translation: kn }
  },
  lng: localStorage.getItem('saathi_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
