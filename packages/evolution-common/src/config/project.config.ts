/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig, {
    ProjectConfiguration,
    setProjectConfiguration
} from 'chaire-lib-common/lib/config/shared/project.config';
import { ISODateTimeStringWithTimezoneOffset } from '../utils/DateTimeUtils';
import { AuditChecksGroup, SurveyBase, AuditRequiredFieldsBySurveyObject } from '../services/audits/types';

/**
 * Specific configuration for the Evolution project
 */
export type EvolutionProjectConfiguration = {
    /**
     * Title of the survey. Used in the page title and headers. It is not in the
     * locales file, as locales are more for questionnaire data per se, while
     * the title is for the whole survey and it makes sense to have it in the
     * configuration.
     */
    title: {
        [lang: string]: string;
    };
    /** Used for Google Maps localization. See
     * https://developers.google.com/maps/coverage for possible region codes */
    region: string;
    /**
     * Start date time for the survey in ISO date time string format with timezone offset
     * (YYYY-MM-DDTHH:MM:SS-/+HH:MM). Example: 2025-01-01T00:00:00-05:00.
     * Interviews started before this date and time should be invalidated and/or ignored.
     * If both startDateTimeWithTimezoneOffset and endDateTimeWithTimezoneOffset are defined,
     * endDateTimeWithTimezoneOffset must be after startDateTimeWithTimezoneOffset.
     * Provide the timezone offset so we can calculate the correct unix epoch.
     * */
    startDateTimeWithTimezoneOffset?: ISODateTimeStringWithTimezoneOffset;
    /**
     * End date time for the survey in ISO date time string format with timezone offset
     * (YYYY-MM-DDTHH:MM:SS-/+HH:MM). Example: 2025-01-01T00:00:00-05:00.
     * Interviews started after this date and time should be invalidated and/or ignored.
     * If both startDateTimeWithTimezoneOffset and endDateTimeWithTimezoneOffset are defined,
     * endDateTimeWithTimezoneOffset must be after startDateTimeWithTimezoneOffset.
     * Provide the timezone offset so we can calculate the correct unix epoch.
     * */
    endDateTimeWithTimezoneOffset?: ISODateTimeStringWithTimezoneOffset;
    /** Whether to log database updates. FIXME This should be server-side only
     * */
    logDatabaseUpdates: boolean;
    /** Age for self response. For household surveys, it is the age from which
     * respondents will be invited to complete their own trips. Defaults to 14
     * */
    selfResponseMinimumAge: number;
    /**
     * Age from which a person can be interviewed. Applies to household surveys
     * only. Below that age, the survey questions will not be asked for this
     * person. Defaults to 0, which means all persons are interviewable.
     */
    interviewableAge: number;
    /**
     * Age at which a person is considered an adult in the survey area. This is
     * used to determine whether a person can be considered an adult for the
     * purposes of the survey. Defaults to 18.
     */
    adultAge: number;
    /**
     * Age at which a person could possibly own a driving license in the survey
     * area. Defaults to 16
     * */
    drivingLicenseAge: number;
    /**
     * Whether to show the support form on all pages of the participant app. If
     * set to `true`, a button will be displayed in the bottom right corner of
     * the page, which opens a form to send a support request.  Defaults to
     * `false`, which means the support form will not be shown.
     *
     * If set to `true`, the SUPPORT_REQUEST_EMAILS environment variable should
     * be set to the emails to which to send the support request emails. This
     * has the format "lang:comma-separated emails;[lang2:comma-separated
     * emails]" where `lang` specifies the language in which to send the emails.
     */
    surveySupportForm: boolean;
    mapDefaultCenter: {
        lat: number;
        lon: number;
    };
    /**
     * URL template for aerial/satellite tile layer. If provided, enables a toggle button
     * to switch between OSM and aerial tiles on maps. Should include {z}, {x}, {y} placeholders.
     * Example: 'https://URL/tiles/{z}/{y}/{x}'
     */
    mapAerialTilesUrl?: string;

    hideStartButtonOnHomePage: boolean;
    introductionTwoParagraph: boolean; // whether to show a second paragraph on the home page
    introBanner: boolean; // seems obsolete. TODO/FIXME: find if this is still useful
    bannerPaths: {
        // seems obsolete. TODO/FIXME: find if this is still useful
        [key: string]: string;
    };
    introLogoAfterStartButton: boolean; // whether to show the logo after the start button on the home page
    logoPaths: {
        [key: string]: string;
    };

    /**
     * Whether to detect the language from the URL. If true, URLs of the form
     * /en, /fr, etc. or with lng=fr in the query string will be used to set the
     * language. Defaults to `true`
     */
    detectLanguageFromUrl: boolean;
    /**
     * If `detectLanguageFromUrl` is false, setting this will use `cookie`,
     * `localStorage` or the navigator to detect the language
     *
     * FIXME Why? Why not just use the URL? This has been part of evolution
     * forever though, so there probably was a reason.
     */
    detectLanguage: boolean;
    /**
     * The names of the languages, used in the language selector on the home page
     */
    languageNames: {
        [key: string]: string;
    };

    /**
     * Whether the survey has an access code. If true, the access code will be
     * added to the admin interview columns. Defaults to false.
     */
    hasAccessCode: boolean;

    /**
     * Color palette for person visualization in maps and charts
     */
    personColorsPalette: string[];

    // Add additional properties to the config
    auth: ProjectConfiguration<unknown>['auth'] & {
        /**
         * If true or with fields defined, the auth model will use the
         * combination of access code and postal code as login credentials.
         *
         * TODO Support options to specify which fields are to be used (other
         * than access code and postal code)
         */
        byField?:
            | boolean
            | {
                  /**
                   * The field to use for the access code. Defaults to 'accessCode'
                   */
                  accessCodeField?: string;
                  /**
                   * The field to use for the postal code. Defaults to 'postalCode'
                   */
                  postalCodeField?: string;
              };
    };

    /**
     * The region to use for postal code validation FIXME Also use for
     * formatting
     * */
    postalCodeRegion: 'canada' | 'quebec' | 'other';

    /**
     * See AuditChecksGroup type for details.
     */
    auditChecksGroup: AuditChecksGroup;

    /**
     * See SurveyBase type for details.
     */
    surveyBase: SurveyBase;

    /**
     * See AuditRequiredFieldsBySurveyObject type for details.
     */
    requiredFieldsBySurveyObject: AuditRequiredFieldsBySurveyObject;

    // TODO Add more project configuration types
};

// Make sure default values are set
const defaultConfig = {
    region: 'CA',
    logDatabaseUpdates: false,
    selfResponseMinimumAge: 14,
    interviewableAge: 5,
    adultAge: 18,
    drivingLicenseAge: 16,
    surveySupportForm: false,
    mapDefaultCenter: {
        lat: 45.5,
        lon: -73.6
    },
    countryCode: 'CA',
    startDateTimeWithTimezoneOffset: undefined,
    endDateTimeWithTimezoneOffset: undefined,
    hideStartButtonOnHomePage: false,
    introductionTwoParagraph: false,
    introBanner: false,
    bannerPaths: {},
    introLogoAfterStartButton: false,
    logoPaths: {},
    detectLanguageFromUrl: true,
    detectLanguage: false,
    languageNames: { en: 'English', fr: 'Français' },
    title: { en: 'Survey', fr: 'Enquête' },
    postalCodeRegion: 'other',
    hasAccessCode: false,
    personColorsPalette: [
        // FIXME See this issue https://github.com/chairemobilite/evolution/issues/1246
        '#FFAE70',
        '#FFBCF2',
        '#F2ED6A',
        '#90E04A',
        '#61CAD8',
        '#9F70FF',
        '#FF6868',
        '#63A021',
        '#21A09E',
        '#4146B5',
        '#9F41B5',
        '#B5417B',
        '#B5B5B5',
        '#B59900',
        '#9E5135',
        '#FFAE70',
        '#FFBCF2',
        '#F2ED6A',
        '#90E04A',
        '#61CAD8',
        '#9F70FF',
        '#FF6868',
        '#63A021',
        '#21A09E',
        '#4146B5',
        '#9F41B5',
        '#B5417B'
    ],
    requiredFieldsBySurveyObject: {
        interview: [],
        household: [],
        home: [],
        organization: [],
        vehicle: [],
        person: [],
        journey: [],
        tripChain: [],
        visitedPlace: [],
        trip: [],
        segment: [],
        junction: [],
        workPlace: [],
        schoolPlace: []
    },
    auditChecksGroup: 'custom', // custom by default so older surveys works.
    surveyBase: 'householdBased'
};

// Validate and set the configuration
const mergedConfig = Object.assign({}, defaultConfig, projectConfig);

setProjectConfiguration<EvolutionProjectConfiguration>(mergedConfig);

export default projectConfig as ProjectConfiguration<EvolutionProjectConfiguration>;
