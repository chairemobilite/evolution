/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// Initialize test wide variables

import i18n from "i18next"
import { initReactI18next } from 'react-i18next';

// hack to make react-router work with jest
import { TextEncoder } from 'node:util';
global.TextEncoder = TextEncoder;

const DEFAULT_LANGUAGE = "en"
const DEFAULT_NAMESPACE = "translations"

// Initialize i18n, with default language
i18n.use(initReactI18next).init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    ns: [DEFAULT_NAMESPACE],
    defaultNS: DEFAULT_NAMESPACE,
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: { [DEFAULT_LANGUAGE]: { [DEFAULT_NAMESPACE]: {} } },
});
