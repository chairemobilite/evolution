/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO Replace with chaire-lib's main import
// NOTE: no legacy import, use chaire-lib
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import moment from 'moment-business-days';
import LanguageDetector from 'i18next-browser-languagedetector';

import config from '../shared/project.config';
import resources from '../../../../../locales/';

const detectorOrder = config.detectLanguageFromUrl ? ['querystring', 'path', 'cookie', 'localStorage'] : config.detectLanguage ? [ 'cookie', 'localStorage', 'navigator'] : ['cookie', 'localStorage'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: {
      // order and from where user language should be detected
      order: detectorOrder,
      lookupFromPathIndex: 0,
      checkWhitelist: true,
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
      escapeValue: false, // not needed for react!!
    },
    react: {
      wait: true
    }
  }, (err, t) => {
    if (err) {
      console.log(err);
    }
  });


if (i18n.language)
{
  i18n.changeLanguage(i18n.language.split('-')[0]); // force remove region specific
}

if (!i18n.language || config.languages.indexOf(i18n.language) <= -1)
{
  i18n.changeLanguage(config.defaultLocale);
}

i18n.on('languageChanged', function(language) {
  document.documentElement.setAttribute('lang', language);
  moment.locale(language);
});

export default i18n
