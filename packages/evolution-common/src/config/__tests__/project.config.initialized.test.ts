/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from "../project.config";

// Mock the project config from evolution-common, which might already have been
// loaded before the first import to the evolution project config. The
// configuration should not be overwritten
jest.mock('chaire-lib-common/lib/config/shared/project.config', () => ({
    ...jest.requireActual('chaire-lib-common/lib/config/shared/project.config'),
    __esModule: true,
    default: {
        region: 'FR',
        selfResponseMinimumAge: 18,
        logDatabaseUpdates: true,
        hideStartButtonOnHomePage: true,
        introductionTwoParagraph: true,
        introBanner: true,
        bannerPaths: { 'en': 'banner-en.png', 'fr': 'banner-fr.png' },
        introLogoAfterStartButton: true,
        logoPaths: { 'en': 'logo-en.png', 'fr': 'logo-fr.png' },
        languageNames: { 'en': 'English', 'fr': 'Français' }
    }
}));

test('test initialized values', () => {
    expect(projectConfig).toEqual(expect.objectContaining({
        region: 'FR',
        selfResponseMinimumAge: 18,
        logDatabaseUpdates: true,
        hideStartButtonOnHomePage: true,
        introductionTwoParagraph: true,
        introBanner: true,
        bannerPaths: { 'en': 'banner-en.png', 'fr': 'banner-fr.png' },
        introLogoAfterStartButton: true,
        logoPaths: { 'en': 'logo-en.png', 'fr': 'logo-fr.png' },
        languageNames: { 'en': 'English', 'fr': 'Français' }
    }));
});
