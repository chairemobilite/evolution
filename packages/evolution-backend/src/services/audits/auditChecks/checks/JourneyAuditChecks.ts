/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { JourneyAuditCheckContext, JourneyAuditCheckFunction } from '../AuditCheckContexts';
import {
    hasInvalidOrDuplicateSequences,
    hasSequenceGaps
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import {
    StartEndable,
    type StartEndDateAndTimesAttributes
} from 'evolution-common/lib/services/baseObjects/StartEndable';

/**
 * Interval from one object's end (departure) to another's start (arrival).
 */
const intervalFromEndToStart = (
    from: StartEndDateAndTimesAttributes,
    to: StartEndDateAndTimesAttributes
): StartEndDateAndTimesAttributes => ({
    startTime: from.endTime,
    startDate: from.endDate,
    endTime: to.startTime,
    endDate: to.startDate
});

export const journeyAuditChecks: { [errorCode: string]: JourneyAuditCheckFunction } = {
    /**
     * Check if journey start date is missing. The start date is taken from assignedDate
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_M_StartDate: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        const hasStartDate = !!journey.startDate;

        if (!hasStartDate) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_M_StartDate',
                version: 1,
                level: 'error',
                message: 'Journey start date is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for visited place sequences that cannot be ordered: missing, non-positive
     * integer, or shared by two visited places.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_InvalidVisitedPlaceSequences: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasInvalidOrDuplicateSequences(journey.visitedPlaces)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_L_InvalidVisitedPlaceSequences',
                version: 1,
                level: 'error',
                message: 'At least one visited place sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the visited place sequences (e.g. 1,2,3,5,6). The questionnaire
     * keeps them contiguous when a visited place is added or deleted, so a hole points at
     * a survey bug worth investigating rather than at unusable data.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_VisitedPlaceSequenceGaps: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasSequenceGaps(journey.visitedPlaces)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_W_VisitedPlaceSequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Visited place sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for trip sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two trips.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_InvalidTripSequences: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasInvalidOrDuplicateSequences(journey.trips)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_L_InvalidTripSequences',
                version: 1,
                level: 'error',
                message: 'At least one trip sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the trip sequences (e.g. 1,2,3,5,6). Trips are generated from
     * consecutive visited places, so a hole points at a survey bug worth investigating.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_TripSequenceGaps: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasSequenceGaps(journey.trips)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_W_TripSequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Trip sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check that journey times run forward: a visited place is not left before
     * it was reached, a visited place is not reached before the previous one
     * was left, a trip does not end before it starts, and a trip does not start
     * before its origin visited place is left or end after its destination
     * visited place is reached. Equal times are allowed. Missing times and time
     * periods are skipped. Dates are used when present so a diary that spans
     * midnight is not flagged.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_InconsistentChronology: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        const visitedPlaces = journey.visitedPlaces;
        const trips = journey.trips;

        const aVisitedPlaceGoesBackward =
            visitedPlaces?.some((visitedPlace) => StartEndable.timesAreValid(visitedPlace) === false) ?? false;
        const aTripGoesBackward = trips?.some((trip) => StartEndable.timesAreValid(trip) === false) ?? false;

        const visitedPlaceSequencesCanBeCompared =
            visitedPlaces !== undefined &&
            visitedPlaces.length > 1 &&
            !hasInvalidOrDuplicateSequences(visitedPlaces) &&
            !hasSequenceGaps(visitedPlaces) &&
            visitedPlaces.every(
                (visitedPlace, index) =>
                    index === 0 || (visitedPlaces[index - 1]._sequence as number) < (visitedPlace._sequence as number)
            );

        const consecutiveVisitedPlacesGoBackward =
            visitedPlaceSequencesCanBeCompared &&
            visitedPlaces.some((visitedPlace, index) => {
                if (index === 0) {
                    return false;
                }
                return (
                    StartEndable.timesAreValid(intervalFromEndToStart(visitedPlaces[index - 1], visitedPlace)) === false
                );
            });

        const aTripDisagreesWithConnectedVisitedPlaces =
            trips?.some(
                (trip) =>
                    (trip.startPlace !== undefined &&
                        StartEndable.timesAreValid(intervalFromEndToStart(trip.startPlace, trip)) === false) ||
                    (trip.endPlace !== undefined &&
                        StartEndable.timesAreValid(intervalFromEndToStart(trip, trip.endPlace)) === false)
            ) ?? false;

        if (
            aVisitedPlaceGoesBackward ||
            consecutiveVisitedPlacesGoBackward ||
            aTripGoesBackward ||
            aTripDisagreesWithConnectedVisitedPlaces
        ) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_L_InconsistentChronology',
                version: 1,
                level: 'error',
                message: 'Journey chronology is inconsistent',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
