/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjects } from '../baseObjects/types';

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
export type SurveyObjectsWithAudits = SurveyObjects & {
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
