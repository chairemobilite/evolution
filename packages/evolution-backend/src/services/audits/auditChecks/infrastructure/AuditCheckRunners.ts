/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import {
    InterviewAuditCheckContext,
    HouseholdAuditCheckContext,
    HomeAuditCheckContext,
    PersonAuditCheckContext,
    JourneyAuditCheckContext,
    VisitedPlaceAuditCheckContext,
    TripAuditCheckContext,
    SegmentAuditCheckContext,
    InterviewAuditCheckFunction,
    HouseholdAuditCheckFunction,
    HomeAuditCheckFunction,
    PersonAuditCheckFunction,
    JourneyAuditCheckFunction,
    VisitedPlaceAuditCheckFunction,
    TripAuditCheckFunction,
    SegmentAuditCheckFunction
} from './AuditCheckContexts';

/**
 * Run all interview audit checks
 */
export const runInterviewAuditChecks = (
    context: InterviewAuditCheckContext,
    auditChecks: { [errorCode: string]: InterviewAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.interview._uuid) {
            audits.push({
                objectType: 'interview',
                objectUuid: context.interview._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all household audit checks
 */
export const runHouseholdAuditChecks = (
    context: HouseholdAuditCheckContext,
    auditChecks: { [errorCode: string]: HouseholdAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.household._uuid) {
            audits.push({
                objectType: 'household',
                objectUuid: context.household._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all home audit checks
 */
export const runHomeAuditChecks = (
    context: HomeAuditCheckContext,
    auditChecks: { [errorCode: string]: HomeAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.home._uuid) {
            audits.push({
                objectType: 'home',
                objectUuid: context.home._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all person audit checks
 */
export const runPersonAuditChecks = (
    context: PersonAuditCheckContext,
    auditChecks: { [errorCode: string]: PersonAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.person._uuid) {
            audits.push({
                objectType: 'person',
                objectUuid: context.person._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all journey audit checks
 */
export const runJourneyAuditChecks = (
    context: JourneyAuditCheckContext,
    auditChecks: { [errorCode: string]: JourneyAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.journey._uuid) {
            audits.push({
                objectType: 'journey',
                objectUuid: context.journey._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all visited place audit checks
 */
export const runVisitedPlaceAuditChecks = (
    context: VisitedPlaceAuditCheckContext,
    auditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.visitedPlace._uuid) {
            audits.push({
                objectType: 'visitedPlace',
                objectUuid: context.visitedPlace._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all trip audit checks
 */
export const runTripAuditChecks = (
    context: TripAuditCheckContext,
    auditChecks: { [errorCode: string]: TripAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.trip._uuid) {
            audits.push({
                objectType: 'trip',
                objectUuid: context.trip._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};

/**
 * Run all segment audit checks
 */
export const runSegmentAuditChecks = (
    context: SegmentAuditCheckContext,
    auditChecks: { [errorCode: string]: SegmentAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.segment._uuid) {
            audits.push({
                objectType: 'segment',
                objectUuid: context.segment._uuid,
                errorCode,
                ...auditResult,
                version: auditResult.version || 1
            });
        }
    }

    return audits;
};
