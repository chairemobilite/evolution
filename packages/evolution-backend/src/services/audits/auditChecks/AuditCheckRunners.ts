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
export const runInterviewAuditChecks = async (
    context: auditChecks.InterviewAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.InterviewAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.interview._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all household audit checks
 */
export const runHouseholdAuditChecks = async (
    context: auditChecks.HouseholdAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.HouseholdAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.household._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all home audit checks
 */
export const runHomeAuditChecks = async (
    context: auditChecks.HomeAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.HomeAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.home._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all person audit checks
 */
export const runPersonAuditChecks = async (
    context: auditChecks.PersonAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.PersonAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.person._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all journey audit checks
 */
export const runJourneyAuditChecks = async (
    context: auditChecks.JourneyAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.JourneyAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.journey._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all visited place audit checks
 */
export const runVisitedPlaceAuditChecks = async (
    context: auditChecks.VisitedPlaceAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.VisitedPlaceAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.visitedPlace._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all trip audit checks
 */
export const runTripAuditChecks = async (
    context: auditChecks.TripAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.TripAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.trip._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};

/**
 * Run all segment audit checks
 */
export const runSegmentAuditChecks = async (
    context: auditChecks.SegmentAuditCheckContext,
    auditChecks: { [errorCode: string]: auditChecks.SegmentAuditCheckFunction }
): Promise<AuditForObject[]> => {
    const audits: AuditForObject[] = [];

    for (const errorCode in auditChecks) {
        const auditResult = await auditChecks[errorCode](context);
        if (auditResult && context.segment._uuid) {
            audits.push(auditResult);
        }
    }

    return audits;
};
