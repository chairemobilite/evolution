/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// Initialize test wide variables

import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import i18n from "i18next"
import { initReactI18next } from 'react-i18next';

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

Enzyme.configure({ adapter: new Adapter() });