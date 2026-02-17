import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const NS = [
  'common',
  'layout',
  'landing',
  'auth',
  'dashboard',
  'accounts',
  'reports',
  'calculators',
  'goals',
  'notifications',
  'settings',
  'consultant',
  'admin',
  'plans',
  'transactions',
  'cards',
  'investments',
  'invitations',
  'messages',
  'connections',
  'payment',
] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['pt-BR', 'en'],
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: [...NS],

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      requestOptions: {
        cache: 'no-cache',
      },
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: true,
    },
  });

// Keep <html lang="..."> in sync
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
