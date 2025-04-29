/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const moment = require('moment-business-days');

moment.updateLocale('fr', {
    holidays: ['2018-09-03', '2018-10-08', '2018-12-25'],
    holidayFormat: 'YYYY-MM-DD'
});

moment.updateLocale('en', {
    holidays: ['2018-09-03', '2018-10-08', '2018-12-25'],
    holidayFormat: 'YYYY-MM-DD'
});

moment.updateLocale('fr', {
    longDateFormat: {
        LL: 'dddd Do MMMM YYYY'
    }
});

moment.updateLocale('en', {
    longDateFormat: {
        LL: 'dddd, MMMM Do YYYY'
    }
});

module.exports = {
    projectShortname: 'household_travel_survey',
    projectDirectory: `${__dirname}/runtime`,
    logoPaths: {
        fr: `/dist/images/logo_eod_2018_fr.svg`,
        en: `/dist/images/logo_eod_2018_en.svg`
    },
    includePartTimeStudentOccupation: false,
    includeWorkerAndStudentOccupation: false,
    acceptUnknownDidTrips: false,
    adminAuth: {
        localLogin: {
            registerWithPassword: true,
            registerWithEmailOnly: true,
            confirmEmail: false,
            forgotPasswordPage: true
        }
    },
    auth: {
        passwordless: {
            directFirstLogin: true
        },
        anonymous: true,
        google: true,
        facebook: false
    },
    logDatabaseUpdates: true,
    askForAccessCode: true,
    interviewableAge: 5,
    isPartTwo: false,
    mapDefaultCenter: {
        lat: 45.503205,
        lon: -73.569417
    },
    mapMaxGeocodingResultsBounds: [
        {
            lat: 45.2229,
            lng: -74.323
        },
        {
            lat: 46.1181,
            lng: -72.9215
        }
    ],
    detectLanguageFromUrl: true,
    detectLanguage: true,
    languages: ['fr', 'en'],
    locales: {
        fr: 'fr-CA',
        en: 'en-CA'
    },
    languageNames: {
        fr: 'Français',
        en: 'English'
    },
    title: {
        fr: 'Enquête sur les déplacements des ménages',
        en: 'Household Travel Survey'
    },
    defaultLocale: 'fr',
    timezone: 'America/Montreal',
    region: 'CA', // Used for Google Maps localization. See https://developers.google.com/maps/coverage for possible region codes
    hasSectionProgressBar: true // If true, show a progress bar at the top of each section
};
