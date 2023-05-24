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
  longDateFormat : {
    LL: "dddd Do MMMM YYYY",
  }
});

moment.updateLocale('en', {
  longDateFormat : {
    LL: "dddd, MMMM Do YYYY",
  }
});

module.exports = {

  projectShortname: 'demo_survey',
  projectDirectory: `${__dirname}/runtime`,
  logoPaths: {
    fr: `/dist/images/logo_eod_2018_fr.svg`,
    en: `/dist/images/logo_eod_2018_en.svg`
  },
  includePartTimeStudentOccupation: false,
  includeWorkerAndStudentOccupation: false,
  acceptUnknownDidTrips: false,
  primaryAuthMethod: 'passwordless',
  auth: {
    localLogin: {
      registerWithPassword: true,
      registerWithEmailOnly: true,
      confirmEmail: false,
      forgotPasswordPage: true
    },
    passwordless: {
      directFirstLogin: true
    },
    anonymous: true,
    google: true,
    facebook: true
  },
  logDatabaseUpdates: true,
  askForAccessCode: true,
  isPartTwo: false,
  mapDefaultCenter: {
    lat: 45.503205,
    lon: -73.569417
  },
  mapMaxGeocodingResultsBounds: [{
      lat: 45.2229,
      lng: -74.3230
    },
    {
      lat: 46.1181,
      lng: -72.9215
  }],
  detectLanguage: false,
  languages: ['fr', 'en'],
  locales: {
    fr: 'fr-CA',
    en: 'en-CA'
  },
  languageNames: {
    fr: "Français",
    en: "English"
  },
  title: {
    fr: "Démo",
    en: "Demo"
  },
  defaultLocale: "fr",
  timezone: 'America/Montreal'
};
