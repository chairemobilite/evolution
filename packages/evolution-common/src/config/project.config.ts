/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig, {
    ProjectConfiguration,
    setProjectConfiguration
} from 'chaire-lib-common/lib/config/shared/project.config';
import { ISODateTimeStringWithTimezoneOffset, Timezone } from '../utils/DateTimeUtils';
import { AuditChecksGroup, SurveyBase, AuditRequiredFieldsBySurveyObject } from '../services/audits/types';
import type { SurveyObjectName } from '../services/baseObjects/types';
import { AccessCodeFormatName } from '../services/accessCode/accessCodeFormats';

/** Age-related survey configuration thresholds. */
export type EvolutionAgesConfiguration = {
    /** Age from which respondents complete their own trips in household surveys. Defaults to 14. */
    selfResponseMinimumAge: number;
    /** Minimum age to interview a household member. Defaults to 5. */
    interviewableAge: number;
    /** Age at which a person is considered an adult. Defaults to 18. */
    adultAge: number;
    /** Minimum age to possibly hold a driving license. Defaults to 16. */
    drivingLicenseAge: number;
    /** Working age threshold, inclusive. Defaults to 15. */
    workingAge: number;
    /** School mandatory age threshold, inclusive. Defaults to 15. */
    schoolMandatoryAge: number;
    /** Maximum plausible person age for widgets and audits. Defaults to 125. */
    maxPersonAge: number;
    /**
     * Age from which a person triggers a reviewer warning audit (inclusive).
     * Applies up to {@link maxPersonAge}. When undefined, no warning audit is raised.
     */
    addAuditWarningVeryOldAge?: number;
};

/** Household vehicle count validation configuration. */
export type EvolutionVehiclesConfiguration = {
    /** Maximum cars per household member. Defaults to 3. */
    maxCarsPerHouseholdMember: number;
    /** Maximum bicycles per household member. Defaults to 3. */
    maxBicyclesPerHouseholdMember: number;
    /** Maximum motorcycles or scooters per household member. Defaults to 3. */
    maxTwoWheelsPerHouseholdMember: number;
};

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
    /**
     * IANA timezone of the survey area (e.g. 'America/Toronto'). Used to
     * display interview timestamps (e.g. start dates in admin dashboards and
     * exports) as local calendar dates. When not set, dates are displayed in
     * UTC (no runtime-dependent default, so servers and browsers always agree).
     */
    timezone?: Timezone;
    /** Whether to log database updates. FIXME This should be server-side only
     * */
    logDatabaseUpdates: boolean;
    /** Maximum household size for widgets and validations. Defaults to 18. */
    maxHouseholdSize: number;
    /** Age thresholds used by widgets, validations, and audits. */
    ages: EvolutionAgesConfiguration;
    vehicles: EvolutionVehiclesConfiguration;
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
     * The expected access code format, chosen among the predefined formats in
     * the catalog (see `accessCodeFormats`). The name matches the example, e.g.
     * `'0000-0000'` (8 digits), `'000-000-000'` (9 digits) or `'ABC-000-000'`.
     * Defaults to `'0000-0000'`.
     *
     * Set it in the survey's `config.js`, for example:
     * ```js
     * accessCodeFormat: '000-000-000'
     * ```
     *
     * It is the single source of truth for the access code format: it drives
     * the widget validation and live formatting, the admin validation list
     * filter and CSV import, and the default backend audit check
     * (`I_I_InvalidAccessCodeFormat`). Surveys can still override the backend
     * validation with `registerAccessCodeValidationFunction` for
     * survey-specific checks (e.g. verifying a code was actually issued).
     *
     * To support a new format, add an entry to the `accessCodeFormats` catalog
     * (ideally via an issue/PR on evolution so it is shared).
     */
    accessCodeFormat: AccessCodeFormatName;

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

    /**
     * Survey objects on which approve/reject controls appear in the review summary.
     * Uses the same names as {@link SurveyObjectName}.
     */
    reviewableSurveyObjects: SurveyObjectName[];

    /**
     * Path to the GeoJSON file for the survey area.
     * Relative to the survey project directory, which is set in config's
     * projectDirectory param
     * If provided, audit checks will use it to validate whether the home geography
     * is within the survey area.
     */
    surveyAreaGeojsonPath?: string;

    // TODO Add more project configuration types
};

// Make sure default values are set
const defaultAgesConfig: EvolutionAgesConfiguration = {
    selfResponseMinimumAge: 14,
    interviewableAge: 5,
    adultAge: 18,
    drivingLicenseAge: 16,
    workingAge: 15,
    schoolMandatoryAge: 15,
    maxPersonAge: 125,
    addAuditWarningVeryOldAge: undefined
};

const defaultVehiclesConfig: EvolutionVehiclesConfiguration = {
    maxCarsPerHouseholdMember: 3,
    maxBicyclesPerHouseholdMember: 3,
    maxTwoWheelsPerHouseholdMember: 3
};

const defaultConfig = {
    region: 'CA',
    logDatabaseUpdates: false,
    maxHouseholdSize: 18,
    ages: defaultAgesConfig,
    vehicles: defaultVehiclesConfig,
    surveySupportForm: false,
    mapDefaultCenter: {
        lat: 45.5,
        lon: -73.6
    },
    countryCode: 'CA',
    startDateTimeWithTimezoneOffset: undefined,
    endDateTimeWithTimezoneOffset: undefined,
    timezone: undefined,
    surveyAreaGeojsonPath: undefined,
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
    accessCodeFormat: '0000-0000',
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
    reviewableSurveyObjects: ['interview', 'home', 'household', 'person'],
    auditChecksGroup: 'custom', // custom by default so older surveys works.
    surveyBase: 'householdBased'
};

// Validate and set the configuration
const mergedConfig = {
    ...defaultConfig,
    ...projectConfig,
    ages: { ...defaultAgesConfig, ...projectConfig.ages },
    vehicles: { ...defaultVehiclesConfig, ...projectConfig.vehicles }
};

setProjectConfiguration<EvolutionProjectConfiguration>(mergedConfig);

export default projectConfig as ProjectConfiguration<EvolutionProjectConfiguration>;
