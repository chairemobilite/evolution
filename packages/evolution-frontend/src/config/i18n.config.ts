/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import moment from 'moment';
import LanguageDetector from 'i18next-browser-languagedetector';
import config from 'chaire-lib-frontend/lib/config/project.config';
// TODO: importing a whole directory is allowed in javascript but not in typescript, find another way to import only the needed locales anyway.
// eslint-disable-next-line
const resources = require('../../../../locales/');
const detectorOrder = config.detectLanguageFromUrl
    ? ['querystring', 'path', 'cookie', 'localStorage']
    : config.detectLanguage
        ? ['cookie', 'localStorage', 'navigator']
        : ['cookie', 'localStorage'];

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init(
        {
            detection: {
                // order and from where user language should be detected
                order: detectorOrder,
                lookupFromPathIndex: 0,
                //checkWhitelist: true, // deprecated
                caches: ['localStorage', 'cookie']
            },
            load: 'languageOnly', // no region-specific,
            preload: config.languages,
            supportedLngs: config.languages,
            nonExplicitSupportedLngs: false,
            resources: resources,
            fallbackLng: config.defaultLocale || 'en',
            debug: false,
            interpolation: {
                escapeValue: false // not needed for react!!
            },
            react: {
                //wait: true, // deprecated
                //useSuspense: false
            }
        },
        (err, t) => {
            if (err) {
                console.log(err);
            }
        }
    );

if (i18n.language) {
    i18n.changeLanguage(i18n.language.split('-')[0]); // force remove region specific
}

if (!i18n.language || config.languages.indexOf(i18n.language) <= -1) {
    i18n.changeLanguage(config.defaultLocale);
}

i18n.on('languageChanged', (language) => {
    document.documentElement.setAttribute('lang', language);
    moment.locale(language);
});

export default i18n;
