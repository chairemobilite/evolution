/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { setProjectConfiguration } from 'chaire-lib-common/lib/config/shared/project.config';
import projectConfig, { EvolutionProjectConfiguration } from '../project.config';
import { ISODateTimeStringWithTimezoneOffset } from '../../utils/DateTimeUtils';

const defaultAges = {
    selfResponseMinimumAge: 14,
    interviewableAge: 5,
    adultAge: 18,
    drivingLicenseAge: 16,
    workingAge: 15,
    schoolMandatoryAge: 15,
    maxPersonAge: 125,
    addAuditWarningVeryOldAge: undefined
};

const defaultVehicles = {
    maxCarsPerHouseholdMember: 3,
    maxBicyclesPerHouseholdMember: 3,
    maxTwoWheelsPerHouseholdMember: 3
};

test('Expected default', () => {
    expect(projectConfig.ages).toEqual(defaultAges);
    expect(projectConfig).toEqual(expect.objectContaining({
        region: 'CA',
        maxHouseholdSize: 18,
        vehicles: defaultVehicles,
        logDatabaseUpdates: false,
        startDateTimeWithTimezoneOffset: undefined,
        endDateTimeWithTimezoneOffset: undefined,
        surveyAreaGeojsonPath: undefined,
        hideStartButtonOnHomePage: false,
        introductionTwoParagraph: false,
        introBanner: false,
        bannerPaths: {},
        introLogoAfterStartButton: false,
        logoPaths: {},
        languageNames: { en: 'English', fr: 'Français' },
        title: { en: 'Survey', fr: 'Enquête' }
    }));
});

test('set project configuration', () => {
    const configToSet = {
        region: 'FR',
        ages: {
            selfResponseMinimumAge: 18,
            interviewableAge: 5,
            adultAge: 18,
            drivingLicenseAge: 16,
            workingAge: 16,
            schoolMandatoryAge: 17,
            maxPersonAge: 125
        },
        maxHouseholdSize: 18,
        vehicles: {
            maxCarsPerHouseholdMember: 3,
            maxBicyclesPerHouseholdMember: 3,
            maxTwoWheelsPerHouseholdMember: 3
        },
        logDatabaseUpdates: true,
        startDateTimeWithTimezoneOffset: '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset,
        endDateTimeWithTimezoneOffset: '2025-12-31T23:59:59-05:00' as ISODateTimeStringWithTimezoneOffset,
        surveyAreaGeojsonPath: 'test.geojson',
        hideStartButtonOnHomePage: true,
        introductionTwoParagraph: true,
        introBanner: true,
        bannerPaths: { en: 'banner-en.png', fr: 'banner-fr.png' },
        introLogoAfterStartButton: true,
        logoPaths: { en: 'logo-en.png', fr: 'logo-fr.png' },
        languageNames: { en: 'English', fr: 'Français' },
        title: { en: 'Survey title', fr: 'Titre de l\'enquête' }
    };
    setProjectConfiguration<EvolutionProjectConfiguration>(configToSet);
    const { ages: agesToSet, ...configWithoutAges } = configToSet;
    expect(projectConfig.ages).toEqual({
        ...agesToSet,
        addAuditWarningVeryOldAge: undefined
    });
    expect(projectConfig).toEqual(expect.objectContaining(configWithoutAges));
});

test('partial vehicles override keeps defaults for omitted limits', () => {
    setProjectConfiguration<EvolutionProjectConfiguration>({
        vehicles: {
            maxCarsPerHouseholdMember: 5
        } as EvolutionProjectConfiguration['vehicles']
    });

    expect(projectConfig.vehicles).toEqual({
        maxCarsPerHouseholdMember: 5,
        maxBicyclesPerHouseholdMember: defaultVehicles.maxBicyclesPerHouseholdMember,
        maxTwoWheelsPerHouseholdMember: defaultVehicles.maxTwoWheelsPerHouseholdMember
    });
});
