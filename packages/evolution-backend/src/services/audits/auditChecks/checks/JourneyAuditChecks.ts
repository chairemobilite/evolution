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
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { getAnswerValue } from 'evolution-common/lib/services/baseObjects/attributeTypes/AnswerStatus';
import { hasIncompatibleBoundaryActivity, hasSchoolBoundaryActivity } from './overnightStayActivities';

/** Trips or visited places mean the journey holds travel that `didTrips` should justify. */
const journeyHasDiaryContent = (journey: Journey): boolean =>
    (journey.trips?.length ?? 0) > 0 || (journey.visitedPlaces?.length ?? 0) > 0;

/** Absent or `false`: the diary follows `didTrips`. Only an explicit `true` skips it. */
const journeySkipsTripDiary = (journey: Journey): boolean => journey._skipTripDiary === true;

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
     * Check if journey start date is missing.
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
     * Flag a journey whose last visited place does not close it
     * (`nextPlaceCategory === 'stayedThereUntilTheNextDay'`).
     *
     * Fires only on the explicit `false` of `journey.isJourneyClosed`.
     *
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_JourneyNotClosed: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (journey.isJourneyClosed !== false) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_JourneyNotClosed',
            version: 1,
            level: 'error',
            message: 'Journey is not closed',
            ignore: false
        };
    },

    /**
     * Flag a journey with more than one visited place answering
     * `nextPlaceCategory === 'stayedThereUntilTheNextDay'`.
     *
     * Fires only on the explicit `true` of `journey.isJourneyClosedMoreThanOnce`.
     *
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_JourneyClosedMoreThanOnce: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (journey.isJourneyClosedMoreThanOnce !== true) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_JourneyClosedMoreThanOnce',
            version: 1,
            level: 'error',
            message: 'Journey is closed more than once',
            ignore: false
        };
    },

    /**
     * Flag a journey that has exactly one visited place.
     * One place is never a complete diary: the person has to leave it for
     * another, or arrive at it from another. Closing that only place
     * (`nextPlaceCategory === 'stayedThereUntilTheNextDay'`) does not exempt it.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_OnlyOneVisitedPlace: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (journey.visitedPlaces?.length !== 1) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_OnlyOneVisitedPlace',
            version: 1,
            level: 'error',
            message: 'Journey has only one visited place',
            ignore: false
        };
    },

    /**
     * Error when `didTrips` was never answered, but the journey already holds
     * visited places or trips.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_MadeTripsUndefinedWithTrips: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        if (journeySkipsTripDiary(journey) || journey.didTrips !== undefined || !journeyHasDiaryContent(journey)) {
            return undefined;
        }
        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_MadeTripsUndefinedWithTrips',
            version: 1,
            level: 'error',
            message: 'Whether the person made trips is unanswered, but the journey has trips or visited places',
            ignore: false
        };
    },

    /**
     * Error when `didTrips` is answered true, but the journey has neither trips nor visited places.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_MadeTripsWithEmptyJourney: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        if (
            journeySkipsTripDiary(journey) ||
            getAnswerValue(journey.didTrips) !== true ||
            journeyHasDiaryContent(journey)
        ) {
            return undefined;
        }
        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_MadeTripsWithEmptyJourney',
            version: 1,
            level: 'error',
            message: 'The person made trips, but the journey has no trips or visited places',
            ignore: false
        };
    },

    /**
     * Error when `didTrips` is answered false, but the journey has trips or visited places.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_DidNotMakeTripsButTripsPresent: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        if (
            journeySkipsTripDiary(journey) ||
            getAnswerValue(journey.didTrips) !== false ||
            !journeyHasDiaryContent(journey)
        ) {
            return undefined;
        }
        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_DidNotMakeTripsButTripsPresent',
            version: 1,
            level: 'error',
            message: 'The person did not make trips, but the journey has trips or visited places',
            ignore: false
        };
    },

    /**
     * Error when `didTrips` is dontKnow, but the journey has trips or visited places.
     * A dontKnow answer should not open the trip diary.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_MadeTripsUnknownWithTrips: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        if (
            journeySkipsTripDiary(journey) ||
            journey.didTrips?.status !== 'dont_know' ||
            !journeyHasDiaryContent(journey)
        ) {
            return undefined;
        }
        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_L_MadeTripsUnknownWithTrips',
            version: 1,
            level: 'error',
            message: 'Whether the person made trips is unknown, but the journey has trips or visited places',
            ignore: false
        };
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
    },

    /**
     * Warning when the first visited place of the journey is not home or another overnight activity.
     * A missing activity is not a mismatch. A school activity is handled by its own check.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_DepartureOfDayNotHomeOrCompatibleActivity: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (!hasIncompatibleBoundaryActivity(journey, 'first')) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_W_DepartureOfDayNotHomeOrCompatibleActivity',
            version: 1,
            level: 'warning',
            message: 'Activity at start of journey is not home or a compatible activity',
            ignore: false
        };
    },

    /**
     * Warning when the last visited place of the journey is not home or another overnight activity.
     * Skipped when the journey is not closed (`isJourneyClosed !== true`), same signal as `J_L_JourneyNotClosed`.
     * A missing activity is not a mismatch. A school activity is handled by its own check.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_ArrivalOfDayNotHomeOrCompatibleActivity: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (journey.isJourneyClosed !== true || !hasIncompatibleBoundaryActivity(journey, 'last')) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_W_ArrivalOfDayNotHomeOrCompatibleActivity',
            version: 1,
            level: 'warning',
            message: 'Activity at end of journey is not home or a compatible activity',
            ignore: false
        };
    },

    /**
     * Warning when the first visited place of the journey is a school activity.
     * A school stay can be legitimate, so this stays a warning separate from the incompatible-activity checks.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_SchoolActivityAtStartOfJourney: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (!hasSchoolBoundaryActivity(journey, 'first')) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_W_SchoolActivityAtStartOfJourney',
            version: 1,
            level: 'warning',
            message: 'School activity at the start of the journey',
            ignore: false
        };
    },

    /**
     * Warning when the last visited place of the journey is a school activity.
     * Skipped when the journey is not closed (`isJourneyClosed !== true`), same signal as `J_L_JourneyNotClosed`.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_SchoolActivityAtEndOfJourney: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (journey.isJourneyClosed !== true || !hasSchoolBoundaryActivity(journey, 'last')) {
            return undefined;
        }

        return {
            objectType: 'journey',
            objectUuid: journey._uuid!,
            errorCode: 'J_W_SchoolActivityAtEndOfJourney',
            version: 1,
            level: 'warning',
            message: 'School activity at the end of the journey',
            ignore: false
        };
    }
};
