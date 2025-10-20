/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import * as auditChecks from './AuditCheckContexts';

/**
 * Run all interview audit checks
 */
export const runInterviewAuditChecks = (
    context: auditChecks.InterviewAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.InterviewAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.interview._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all household audit checks
 */
export const runHouseholdAuditChecks = (
    context: auditChecks.HouseholdAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.HouseholdAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.household._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all home audit checks
 */
export const runHomeAuditChecks = (
    context: auditChecks.HomeAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.HomeAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.home._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all person audit checks
 */
export const runPersonAuditChecks = (
    context: auditChecks.PersonAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.PersonAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.person._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all journey audit checks
 */
export const runJourneyAuditChecks = (
    context: auditChecks.JourneyAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.JourneyAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.journey._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all visited place audit checks
 */
export const runVisitedPlaceAuditChecks = (
    context: auditChecks.VisitedPlaceAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.VisitedPlaceAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.visitedPlace._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all trip audit checks
 */
export const runTripAuditChecks = (
    context: auditChecks.TripAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.TripAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.trip._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all segment audit checks
 */
export const runSegmentAuditChecks = (
    context: auditChecks.SegmentAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.SegmentAuditCheckFunction }
): AuditForObject[] => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = auditChecks[errorCode](context);
        if (auditResult && context.segment._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};
