/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file contains types that are used for the questionnaire configuration and flow
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { TFunction } from 'i18next';
import { PersonAttributes } from '../../baseObjects/Person';
import { JourneyAttributes } from '../../baseObjects/Journey';
import { TripAttributes } from '../../baseObjects/Trip';
import * as VPAttr from '../../baseObjects/attributeTypes/VisitedPlaceAttributes';
import { Optional } from '../../../types/Optional.type';
import { SegmentAttributes } from '../../baseObjects/Segment';
import { HouseholdAttributes } from '../../baseObjects/Household';
import { NavigationSection } from './NavigationTypes';

export type ParsingFunction<T> = (interview: UserInterviewAttributes, path: string, user?: CliUser) => T;

export type LangData = {
    [lang: string]: string | ParsingFunction<string>;
};

/**
 * Function that produces a translated string. It takes a translation function
 * `t`, with the interview, path and user data.
 *
 * Note: If the translated string contains any data coming from the
 * participant's interview, this field should be sanitized before being
 * concatenated to the label, to avoid javascript injection attacks. It can be
 * done with the `lodash/escape` package.
 *
 * @param {TFunction} t Translation function to be used for language translation
 * @param {UserInterviewAttributes} interview User interview attributes data
 * @param {string} path The path or key used for translation lookup
 * @param {CliUser} [user] Optional client user information
 * @returns A translated string based on the provided parameters
 */
export type TranslatableStringFunction = (
    t: TFunction,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
) => string;

export type I18nData = string | LangData | TranslatableStringFunction;

type Required<T> = { [P in keyof T]-?: T[P] };
// This recursive generic type is taken from this stack overflow question:
// https://stackoverflow.com/questions/65332597/typescript-is-there-a-recursive-keyof
// But in order to be able to type-check strings for objects with uuid keys, we
// only allow simple fields in this type, not fields reaching object types (like
// `household` directly)
// TODO This is not evolution-specific, it can go somewhere else once the types are fixed
type RecursiveFinalKeyOf<TObj extends object> = {
    [TKey in keyof TObj & (string | number)]: TObj[TKey] extends any[]
        ? `${TKey}`
        : TObj[TKey] extends object | undefined
          ? `${TKey}.${RecursiveFinalKeyOf<Required<TObj[TKey]>>}`
          : `${TKey}`;
}[keyof TObj & (string | number)];

export type InterviewResponsePath = RecursiveFinalKeyOf<Required<InterviewResponse>>;

type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object | undefined
          ? RecursivePartial<T[P]>
          : T[P];
};

export type PartialInterviewResponse = RecursivePartial<InterviewResponse>;

// Type for the validations, which should have the same keys as the response, but with boolean values
type RecursiveBoolean<TObj extends object> = {
    [TKey in keyof TObj]?: TObj[TKey] extends object ? RecursiveBoolean<Required<TObj[TKey]>> : boolean;
};
export type InterviewValidations = RecursiveBoolean<Required<InterviewResponse>>;

// The following types are those in the response field of the interview object.
// They use the types of the survey objects for the attributes, but extended
// attributes are in an object with the key being the object uuid, instead of an
// array of objects, like the composed attributes of the corresponding objects

export type Household = HouseholdAttributes & {
    persons?: {
        [personId: string]: Person;
    };
};

type SurveyPointProperties = {
    lastAction: 'findPlace' | 'shortcut' | 'mapClicked' | 'markerDragged';
};

/**
 * @typedef {Object} Person
 * @property {number} _sequence The sequence number of the person.
 * @property {string} whoWillAnswerForThisPerson UUID of the person who responds for this person.
 * @property {{ [journeyId: string]: Journey }} [journeys] The journeys associated with this person.
 */
export type Person = PersonAttributes & {
    _sequence: number;
    /** uuid of the person who responds for this person (for household where more than 1 person have more than the minimum self response age) */
    whoWillAnswerForThisPerson?: string;
    journeys?: {
        [journeyId: string]: Journey;
    };
};

/**
 * @typedef {Object} Journey
 * @property {number} _sequence The sequence number of the journey.
 * @property {string} [departurePlaceType] The type of the departure place.
 * @property {{ [tripId: string]: Trip }} [trips] The trips associated with this journey.
 * @property {{ [visitedPlaceId: string]: VisitedPlace }} [visitedPlaces] The visited places associated with this journey.
 */
export type Journey = JourneyAttributes & {
    _sequence: number;
    departurePlaceType?: string;
    trips?: {
        [tripId: string]: Trip;
    };
    visitedPlaces?: {
        [visitedPlaceId: string]: VisitedPlace;
    };
};

// FIXME We are not using the VisitedPlaceAttributes type here because during survey, most of the data from that type is rather as a property of the geography feature and not as fields of the object
export type VisitedPlace = {
    _sequence: number;
    _uuid: string;
    activity?: Optional<VPAttr.Activity>;
    activityCategory?: Optional<VPAttr.ActivityCategory>;
    geography?: GeoJSON.Feature<GeoJSON.Point, SurveyPointProperties>;
    departureTime?: number;
    arrivalTime?: number;
} & (
    | { alreadyVisitedBySelfOrAnotherHouseholdMember?: false; name?: string; shortcut?: never }
    | { alreadyVisitedBySelfOrAnotherHouseholdMember: true; name?: never; shortcut?: string }
);

export type Trip = TripAttributes & {
    _sequence: number;
    _originVisitedPlaceUuid?: string;
    _destinationVisitedPlaceUuid?: string;
    segments?: {
        [segmentUuid: string]: Segment;
    };
};

export type Segment = SegmentAttributes & {
    _sequence: number;
    _isNew: boolean;
    modePre?: string;
    sameModeAsReverseTrip?: boolean;
    hasNextMode?: boolean;
};

type SectionStatus = {
    _isCompleted?: boolean;
    _startedAt: number;
};

/**
 * Type the common response fields for any survey
 *
 * TODO Update to use new types in surveyObjects
 *
 * @export
 * @interface InterviewResponse
 */
export type InterviewResponse = {
    // Volatile survey workflow fields:
    _activePersonId?: string;
    _activeTripId?: string;
    _activeJourneyId?: string;
    _activeVisitedPlaceId?: string;
    /**
     * @deprecated Navigation service now handles the current section and other
     * navigation
     * */
    _activeSection?: string;

    // Participant/web interview data
    _browser?: { [key: string]: unknown };
    _ip?: string;
    _startedAt?: number;
    _updatedAt?: number;
    _language?: string;
    _isCompleted?: boolean;
    _completedAt?: number;

    _sections?: {
        [sectionName: string]: SectionStatus & {
            [iterationContextString: string]: SectionStatus;
        };
    } & {
        _actions: {
            section: string;
            iterationContext?: string[];
            action: 'start';
            ts: number;
        }[];
    };

    // Actual response
    household?: Household;
    home?: {
        region?: string;
        country?: string;
        geography?: GeoJSON.Feature<GeoJSON.Point, SurveyPointProperties>;
    };
    // TODO Refactor the types to use the new types in surveyObjects
    [key: string]: any;
};

export type CorrectedResponse = InterviewResponse & {
    _correctedResponseCopiedAt?: number;
    _validationComment?: string;
};

export interface InterviewAudits {
    [validationId: string]: number;
}

/**
 * Interview attributes visible to users. This is a user-facing object and does
 * not contain any administrative data for this interview.
 *
 * @export
 * @interface UserInterviewAttributes
 */
export interface UserInterviewAttributes {
    id: number;
    uuid: string;
    participant_id: number;
    is_completed: boolean;
    response: InterviewResponse;
    validations: InterviewValidations;
    is_valid: boolean;
    is_questionable?: boolean;
    userRoles?: string[];
}

/**
 * Interview attributes, describing a complete interview object. This object
 * will typically be available to admins to other user roles.
 *
 * @export
 * @interface InterviewAttributes
 */
export interface InterviewAttributes extends UserInterviewAttributes {
    is_active?: boolean;
    is_started?: boolean;
    corrected_response?: CorrectedResponse;
    audits?: InterviewAudits;
    is_validated?: boolean;
    is_questionable?: boolean;
    is_frozen?: boolean;
    // TODO Type the following fields to date times
    start_at?: string;
    end_at?: string;
    created_at?: string;
    updated_at?: string;
    survey_id?: number;
}

export interface InterviewListAttributes {
    id: number;
    uuid: string;
    participant_id: number;
    response: InterviewResponse;
    corrected_response: CorrectedResponse;
    is_valid?: boolean;
    is_completed?: boolean;
    is_validated?: boolean;
    is_questionable?: boolean;
    username: string;
    facebook: boolean;
    google: boolean;
    audits?: InterviewAudits;
    created_at?: string;
    updated_at?: string;
}

/**
 * Type of the interview for validation and administrative lists
 *
 * TODO: See if the consumers of this type can template it so it can be fully
 * typed per project
 */
export interface InterviewStatusAttributesBase {
    id: number;
    uuid: string;
    response: PartialInterviewResponse;
    is_valid?: boolean;
    is_completed?: boolean;
    is_validated?: boolean;
    username: string;
    facebook: boolean;
    google: boolean;
}

/**
 * Function to redirect the page to a specific URL. It takes as argument either
 * a string with the URL to redirect to, or an object with the pathname and
 * search keys (to add as query strings)
 */
export type GotoFunction = (to: string | { pathname?: string; search?: string }) => void | Promise<void>;

/**
 * Type of the user action that can be sent to the server when updating the
 * interview. This is used to track the actions of the user in the survey and
 * to provide a better experience for the user.
 */
export type UserAction =
    | {
          type: 'buttonClick';
          buttonId: string;
          /**
           * Widgets that were hidden in the section when the button was clicked
           */
          hiddenWidgets?: string[];
      }
    | {
          type: 'widgetInteraction';
          widgetType: string;
          path: string;
          value: unknown;
      }
    | {
          type: 'sectionChange';
          targetSection: NavigationSection;
          previousSection?: NavigationSection;
          /**
           * Widgets that were hidden in the previous section before navigating away
           */
          hiddenWidgets?: string[];
      }
    | {
          type: 'languageChange';
          language: string;
      }
    | {
          type: 'interviewOpen';
          browser: { [key: string]: unknown };
          language: string;
      };

/**
 * Type of the callback to send interview updates to the server
 *
 * @param {Object} data
 * @param {string} [data.sectionShortname] The shortname of the current section
 * @param {Object} [data.valuesByPath] The values to update in the interview.
 * The key is the path to update and the value is the new value. A dot-separated
 * path will be exploded to the corresponding nested object path.
 * @param {string[]} [data.unsetPaths] The paths to unset in the interview. A
 * dot-separated path will be exploded to the corresponding nested object path.
 * @param {UserRuntimeInterviewAttributes} [data.interview] The current
 * interview
 * @param {GotoFunction} [data.gotoFunction] A function used to redirect the
 * page to a specific URL
 * @param {UserAction} [data.userAction] The user action that triggered the
 * update. Leave empty if the update was not triggered by a user action.
 * @param {(interview: UserRuntimeInterviewAttributes) => void} [callback] An
 * optional function to call after the interview has been updated
 *
 * @returns void
 */
export type StartUpdateInterview = (
    data: {
        sectionShortname?: string;
        valuesByPath?: { [path: string]: unknown };
        unsetPaths?: string[];
        interview?: UserRuntimeInterviewAttributes;
        gotoFunction?: GotoFunction;
        userAction?: UserAction;
    },
    callback?: (interview: UserRuntimeInterviewAttributes) => void
) => void;

export type StartAddGroupedObjects = (
    newObjectsCount: number,
    insertSequence: number | undefined,
    path: string,
    attributes?: { [objectField: string]: unknown }[],
    callback?: (interview: UserRuntimeInterviewAttributes) => void,
    returnOnly?: boolean
) => any;

export type StartRemoveGroupedObjects = (
    paths: string | string[],
    callback?: (interview: UserRuntimeInterviewAttributes) => void,
    returnOnly?: boolean
) => any;

/**
 * Type of the callback to trigger navigation in the current interview
 *
 * @param {Object} options
 * @param {NavigationSection} [options.requestedSection] The section to navigate
 * to, if any. If not provided, the next section will be determined by the
 * navigation service.
 * @param {{ [path: string]: unknown }} [options.valuesByPath] The values to
 * update in the interview.  The key is the path to update and the value is the
 * new value. A dot-separated path will be exploded to the corresponding nested
 * object path.
 * @param {GotoFunction} [options.gotoFunction] A function used to redirect the
 * page to a specific URL
 * @param {(interview: UserRuntimeInterviewAttributes) => void} [callback] An
 * optional function to call after the interview has been updated and navigation
 * is complete
 * @returns The dispatched action
 */
export type StartNavigate = (
    options?: {
        requestedSection?: NavigationSection;
        valuesByPath?: { [path: string]: unknown };
        gotoFunction?: GotoFunction;
    },
    callback?: (interview: UserRuntimeInterviewAttributes, targetSection: NavigationSection) => void
) => any;

export type InterviewUpdateCallbacks = {
    startUpdateInterview: StartUpdateInterview;
    startAddGroupedObjects: StartAddGroupedObjects;
    startRemoveGroupedObjects: StartRemoveGroupedObjects;
    startNavigate: StartNavigate;
};

export type ParsingFunctionWithCallbacks<T> = (
    callbacks: InterviewUpdateCallbacks,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
) => T;

export type ButtonAction = (
    callbacks: InterviewUpdateCallbacks,
    interview: UserRuntimeInterviewAttributes,
    path: string,
    section: string,
    sections: { [key: string]: any },
    saveCallback?: ParsingFunctionWithCallbacks<void>
) => void;

export type WidgetStatus = {
    path: string;
    customPath?: string;
    isVisible: boolean;
    isDisabled: boolean;
    isCollapsed: boolean;
    isEmpty: boolean;
    isCustomEmpty: boolean;
    isValid: boolean;
    isResponded: boolean;
    isCustomResponded: boolean;
    errorMessage?: I18nData;
    groupedObjectId?: string;
    value: unknown;
    customValue?: unknown;
    /** Key that should be changed if the widget is updated outside the application workflow, eg. from the server */
    currentUpdateKey: number;
};

/* FIXME This type represents what was in the legacy evolution, with fields that
 evolve throughout the application, they represent state of the local interview
 more than interview attributes. This all should be moved to some class, with
 methods to follow the state of the current interview. */
export type RuntimeInterviewAttributes = {
    previousWidgets?: {
        [widgetShortname: string]: WidgetStatus;
    };
    previousGroups?: {
        [groupName: string]: {
            [groupId: string]: {
                [widgetShortname: string]: WidgetStatus;
            };
        };
    };
    // These are widgets statuses for the current section, if they are not grouped
    widgets: { [widgetShortname: string]: WidgetStatus };
    // These are the widget status for the groups in the current section
    groups: {
        [groupName: string]: {
            [groupId: string]: {
                [widgetShortname: string]: WidgetStatus;
            };
        };
    };
    // Contains the paths in the response of the visible widgets... FIXME Rename?
    visibleWidgets: string[];
    allWidgetsValid: boolean;
    // Name of the currently loaded section
    sectionLoaded?: string;
};

export type UserRuntimeInterviewAttributes = RuntimeInterviewAttributes & UserInterviewAttributes;
