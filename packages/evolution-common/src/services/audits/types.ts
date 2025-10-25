/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ParentSurveyObjects, SurveyObjectNames } from '../baseObjects/types';

export type Audit = {
    /**
     * Indicate the current version of a validation. If the validation changes, the version will change
     */
    version: number;
    /**
     * audit level type
     */
    level?: 'error' | 'warning' | 'info'; // empty = error
    /**
     * The code of this validation. It should be unique per interview object.
     */
    errorCode: string;
    /**
     * A valid i18n key to translate this message. If not set, the errorCode will be used as the i18n key.
     */
    message?: string;
    /**
     * Whether to ignore this validation in the interface. Defaults to false
     */
    ignore?: boolean;
};

export type AuditForObject = Audit & {
    /**
     * The type of the object this audit applies to. Can be 'interview', 'home', 'person', 'household', etc.
     */
    objectType: string;
    /**
     * The object's UUID. If the object is a single object without a specific uuid, like the interview or household, the interview's uuid is used for this field.
     */
    objectUuid: string;
};

export type Audits = { [errorCode: string]: Audit }; // audits by errorCode (key)

/**
 * Survey objects with audits
 *
 * This is the base type to store survey objects with their audits.
 */
export type SurveyObjectsWithAudits = ParentSurveyObjects & {
    audits: AuditForObject[]; // all audits for the interview and its survey objects
    auditsByObject?: AuditsByObject; // audits by each object type
};

// Audits by audit level (error, warning, info) and object type
// This is used to get the audit statistics by level and object type.
export type AuditStatsByLevelAndObjectType = {
    [level: string]: {
        [objectType: string]: {
            errorCode: string;
            count: number | undefined;
        }[];
    };
};

// Includes audits for each object type, by uuid when nested/composed
export type AuditsByObject = {
    interview: AuditForObject[];
    household: AuditForObject[];
    home: AuditForObject[];
    persons: {
        [key: string]: AuditForObject[]; // key: uuid
    };
    journeys: {
        [key: string]: AuditForObject[]; // key: uuid
    };
    visitedPlaces: {
        [key: string]: AuditForObject[]; // key: uuid
    };
    trips: {
        [key: string]: AuditForObject[]; // key: uuid
    };
    segments: {
        [key: string]: AuditForObject[]; // key: uuid
    };
};

/**
 * The group of audit checks to use.
 * This is used to determine which audit checks to run.
 *
 * Travel survey: a typical Origin-Destination/travel survey
 * Long distance survey: a survey for long-distance travel, usually with multi-days journeys
 * Usual places survey: a survey asking for places where people go on a regular basis
 * Minimum survey: a survey with the minimum required fields
 * Custom survey: a survey with custom audit checks (will not run audit checks from evolution)
 *   For custom surveys, the audit checks must be configured in the survey project.
 *
 * New groups may be added in the future.
 */
export type AuditChecksGroup = 'travelSurvey' | 'longDistanceSurvey' | 'usualPlacesSurvey' | 'minimum' | 'custom';

/**
 * The scope/base of the survey.
 * This is used to determine which survey objects to audit.
 * Household survey: a survey in which all household members are surveyed
 * Person survey: a survey that only surveys a single person
 * Note: all surveys should ask for the household members
 * characteristics even in person-based surveys (for comparison and weighting purposes).
 * New bases may be added in the future, like Vehicle, Organization, etc.
 */
export type SurveyBase = 'householdBased' | 'personBased';

/**
 * The fields that are required for each survey object.
 * A required field will make an audit check return an error if it is missing
 * Some fields may return an audit check error only if the conditional(s) for their presence is met.
 * See audit checks directory for details: evolution-backend/src/services/audits/auditChecks
 */
export type AuditRequiredFieldsBySurveyObject = {
    [key in SurveyObjectNames]: string[];
};
