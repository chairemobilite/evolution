/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import path from 'path';

declare global {
    // eslint-disable-next-line no-var
    var __CUSTOM_LOCALES_PATH__: string | undefined;
    var __CONFIG__: Record<string, any> | undefined
}

// NotFoundPageTitle is only in base, Cancel is in both base and custom
const baseResources = {
    en: {
        main: {
            NotFoundPageTitle: 'Page Not Found - 404',
            Cancel: 'Cancel'
        }
    },
    fr: {
        main: {
            NotFoundPageTitle: 'Page non trouvée - 404',
            Cancel: 'Annuler'
        }
    }
};

const customLocalesPath = path.resolve(__dirname, './fixtures/customLocales.js');

const sharedKey = 'Cancel';
const customOnlyKey = 'CustomOnlyKey';

const loadI18n = (customPath?: string) => {
    jest.resetModules();

    if (customPath === undefined) {
        delete global.__CUSTOM_LOCALES_PATH__;
    } else {
        global.__CUSTOM_LOCALES_PATH__ = customPath;
    }
    // Need to mock the locales resources before loading the i18n config, as
    // webpack does the packing of the locales in a module, which is not the
    // case here. virtual because the module doesn't actually exist at this
    // moment, but it allows us to mock it for testing purposes.
    jest.doMock('../../../../../locales/', () => baseResources, { virtual: true });

    let instance: any;
    jest.isolateModules(() => {
        instance = require('../i18n.config').default;
    });
    return instance;
};

describe('i18n.config custom locales override', () => {
    beforeEach(() => {
        (global as any).document = {
            documentElement: {
                setAttribute: jest.fn()
            }
        };
        global.__CONFIG__ = { languages: ['en', 'fr'], defaultLocale: 'en', detectLanguage: false, detectLanguageFromUrl: false };
    });

    afterEach(() => {
        delete global.__CUSTOM_LOCALES_PATH__;
        jest.clearAllMocks();
    });

    test.each([{
        title: 'without __CUSTOM_LOCALES_PATH__',
        customPath: undefined,
        expectWarn: false,
        expectedShared: 'Cancel',
        expectedCustom: undefined
    },
    {
        title: 'with invalid __CUSTOM_LOCALES_PATH__',
        customPath: '/path/does/not/exist',
        expectWarn: true,
        expectedShared: 'Cancel',
        expectedCustom: undefined
    },
    {
        title: 'with valid __CUSTOM_LOCALES_PATH__',
        customPath: customLocalesPath,
        expectWarn: false,
        expectedShared: 'Abort',
        expectedCustom: 'Custom only (en)'
    }])('$title', ({ customPath, expectWarn, expectedShared, expectedCustom }) => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const i18n = loadI18n(customPath);
        const resources = i18n?.options?.resources as any;

        expect(resources?.en?.main?.[sharedKey]).toBe(expectedShared);
        expect(resources?.en?.main?.[customOnlyKey]).toBe(expectedCustom);

        if (expectWarn) {
            expect(warnSpy).toHaveBeenCalledTimes(1);
        } else {
            expect(warnSpy).not.toHaveBeenCalled();
        }

        warnSpy.mockRestore();
    });
});

export {};

