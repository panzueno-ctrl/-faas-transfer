import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from '../locales/fr.json';
import en from '../locales/en.json';
import it from '../locales/it.json';

const LANGUAGE_KEY = 'faas_settings'; // On lit ça depuis les paramètres (clé 'language')

const languageDetector: any = {
    type: 'languageDetector',
    async: true,
    detect: async (callback: (lng: string) => void) => {
        try {
            const settingsData = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (settingsData) {
                const settings = JSON.parse(settingsData);
                if (settings.language) {
                    return callback(settings.language);
                }
            }
        } catch (error) {
            console.log('Erreur lecture langue', error);
        }
        callback('fr'); // Français par défaut
    },
    init: () => {},
    cacheUserLanguage: () => {},
};

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v3',
        resources: {
            fr: { translation: fr },
            en: { translation: en },
            it: { translation: it },
        },
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false, // React gère déjà l'échappement XSS
        },
    });

export default i18n;
