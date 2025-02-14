/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { setProjectConfiguration } from "chaire-lib-common/lib/config/shared/project.config";
import projectConfig, { EvolutionProjectConfiguration } from "../project.config";

test('Expected default', () => {
    expect(projectConfig).toEqual(expect.objectContaining({
        region: 'CA',
        selfResponseMinimumAge: 14,
        drivingLicenseAge: 16,
        logDatabaseUpdates: false,
        hideStartButtonOnHomePage: false,
        introductionTwoParagraph: false,
        introBanner: false,
        bannerPaths: {},
        introLogoAfterStartButton: false,
        logoPaths: {},
        languageNames: { 'en': 'English', 'fr': 'Français' },
        title: { 'en': 'Survey', 'fr': 'Enquête' }
    }));
});

test('set project configuration', () => {
    const configToSet = {
        region: 'FR',
        selfResponseMinimumAge: 18,
        drivingLicenseAge: 16,
        logDatabaseUpdates: true,
        hideStartButtonOnHomePage: true,
        introductionTwoParagraph: true,
        introBanner: true,
        bannerPaths: { 'en': 'banner-en.png', 'fr': 'banner-fr.png' },
        introLogoAfterStartButton: true,
        logoPaths: { 'en': 'logo-en.png', 'fr': 'logo-fr.png' },
        languageNames: { 'en': 'English', 'fr': 'Français' },
        title: { 'en': 'Survey title', 'fr': 'Titre de l\'enquête' }
    }
    setProjectConfiguration<EvolutionProjectConfiguration>(configToSet);
    expect(projectConfig).toEqual(expect.objectContaining(configToSet));
});
