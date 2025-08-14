/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// Since playwright tests are not run in the browser context, to use
// translations for text validation, the i18n needs to be configured similar to
// the backend's approach. This file was copy-pasted and adapted from the
// chaire-lib-backend/src/config/i18next.ts file.
import i18next from 'i18next';
// eslint-disable-next-line n/no-unpublished-import
import Backend from 'i18next-fs-backend';
import { join } from 'path';
import fs from 'fs';

// See if there are translation files for language and namespace in the registered directories
const getTranslationPath = (lng: string, namespace: string) => {
    if (translationPaths.length === 0) {
        console.warn('No translation path specified');
    }
    for (let i = 0; i < translationPaths.length; i++) {
        const translationPath = translationPaths[i];
        if (fs.existsSync(`${translationPath}/${lng}/${namespace}.yml`)) {
            return `${translationPath}/{{lng}}/{{ns}}.yml`;
        } else if (fs.existsSync(`${translationPath}/${lng}/${namespace}.json`)) {
            return `${translationPath}/{{lng}}/{{ns}}.json`;
        } else if (fs.existsSync(`${translationPath}/${lng}/${namespace}.yaml`)) {
            return `${translationPath}/{{lng}}/{{ns}}.yaml`;
        }
    }
    // Default is evolution's main locales files
    return join(__dirname, '../../../../locales/{{lng}}/{{ns}}.json');
};

const translationPaths: string[] = [];
/**
 * Register a directory where translation files are located. Note that this
 * should be called before the i18n is first used by the server, otherwise, it
 * won't be used.
 *
 * @param dir Absolute path to directory where the locales files are. This
 * directory should contain one directory per locale, with the translations
 * files in it.
 */
export const registerTranslationDir = (dir: string) => {
    if (fs.existsSync(dir)) {
        translationPaths.push(dir);
    } else {
        console.log(`i18next directory to register does not exist: ${dir}`);
    }
};

const namespaces = ['main', 'auth', 'survey'];
/**
 * Add a translation namespace to the translation object. Note that this should
 * be called before the i18n is first used by the server, otherwise, it won't be
 * used.
 *
 * @param ns The namespace to add
 */
export const addTranslationNamespace = (ns: string) => {
    if (!namespaces.includes(ns)) {
        namespaces.push(ns);
    }
};

let initialized = false;
const initializeI18n = (languages: string[]) => {
    i18next.use(Backend).init({
        initImmediate: false,
        load: 'languageOnly', // no region-specific,
        supportedLngs: languages,
        preload: languages,
        nonExplicitSupportedLngs: false,
        fallbackLng: languages[0] || 'en',
        ns: namespaces,
        defaultNS: 'server',
        debug: false,
        backend: {
            loadPath: getTranslationPath
        }
    });
    initialized = true;
};

const getI18n = (languages: string[]) => {
    if (!initialized) {
        initializeI18n(languages);
    }
    return i18next;
};

export default getI18n;
