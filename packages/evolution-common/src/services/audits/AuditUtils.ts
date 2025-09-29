/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, Audits } from './types';

export const auditArrayToAudits = (auditsArr: AuditForObject[]): { [objectKey: string]: Audits } => {
    const audits: { [objectKey: string]: Audits } = {};

    auditsArr.forEach((audit) => {
        const objectKey = `${audit.objectType}.${audit.objectUuid}`;
        const objectAudits = audits[objectKey] || {};
        objectAudits[audit.errorCode] = {
            version: audit.version,
            errorCode: audit.errorCode,
            message: audit.message,
            level: audit.level,
            ignore: audit.ignore
        };
        audits[objectKey] = objectAudits;
    });

    return audits;
};

export const auditsToAuditArray = (
    audits: Audits,
    objectData: Pick<AuditForObject, 'objectType' | 'objectUuid'>
): AuditForObject[] =>
    Object.keys(audits).map((errorCode) => ({
        ...objectData,
        ...audits[errorCode]
    }));

/**
 * Converts an array of audits to the AuditsByObject structure
 * Groups audits by object type and UUID for easy access
 * @param auditsArray - Array of audit objects
 * @returns AuditsByObject structure with audits grouped by type and UUID
 */
export const auditsArrayToAuditsByObject = (auditsArray: AuditForObject[]): import('./types').AuditsByObject => {
    const auditsByObject: import('./types').AuditsByObject = {
        interview: [],
        household: [],
        home: [],
        persons: {},
        journeys: {},
        visitedPlaces: {},
        trips: {},
        segments: {}
    };

    auditsArray.forEach((audit) => {
        switch (audit.objectType) {
        case 'interview':
            auditsByObject.interview.push(audit);
            break;
        case 'household':
            auditsByObject.household.push(audit);
            break;
        case 'home':
            auditsByObject.home.push(audit);
            break;
        case 'person':
            if (!auditsByObject.persons[audit.objectUuid]) {
                auditsByObject.persons[audit.objectUuid] = [];
            }
            auditsByObject.persons[audit.objectUuid].push(audit);
            break;
        case 'journey':
            if (!auditsByObject.journeys[audit.objectUuid]) {
                auditsByObject.journeys[audit.objectUuid] = [];
            }
            auditsByObject.journeys[audit.objectUuid].push(audit);
            break;
        case 'visitedPlace':
            if (!auditsByObject.visitedPlaces[audit.objectUuid]) {
                auditsByObject.visitedPlaces[audit.objectUuid] = [];
            }
            auditsByObject.visitedPlaces[audit.objectUuid].push(audit);
            break;
        case 'trip':
            if (!auditsByObject.trips[audit.objectUuid]) {
                auditsByObject.trips[audit.objectUuid] = [];
            }
            auditsByObject.trips[audit.objectUuid].push(audit);
            break;
        case 'segment':
            if (!auditsByObject.segments[audit.objectUuid]) {
                auditsByObject.segments[audit.objectUuid] = [];
            }
            auditsByObject.segments[audit.objectUuid].push(audit);
            break;
        default:
            // Handle unknown object types - could log a warning
            console.error(`Unknown audit object type: ${audit.objectType}`);
            break;
        }
    });

    return auditsByObject;
};
