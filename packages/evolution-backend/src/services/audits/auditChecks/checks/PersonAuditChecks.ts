/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import projectConfig from 'evolution-common/lib/config/project.config';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { PersonAuditCheckContext, PersonAuditCheckFunction } from '../AuditCheckContexts';
import {
    hasInvalidOrDuplicateSequences,
    hasSequenceGaps
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { getAnswerValue } from 'evolution-common/lib/services/baseObjects/attributeTypes/AnswerStatus';

/** Trips or visited places mean the journey holds travel that `didTrips` should justify. */
const journeyHasDiaryContent = (journey: Journey): boolean =>
    (journey.trips?.length ?? 0) > 0 || (journey.visitedPlaces?.length ?? 0) > 0;

const journeyDidTripsIsUnanswered = (journey: Journey): boolean => journey.didTrips === undefined;

/** Absent or `false`: the diary follows `didTrips`. Only an explicit `true` skips it. */
const journeySkipsTripDiary = (journey: Journey): boolean => journey._skipTripDiary === true;

const personJourneyInconsistencyAudit = (
    person: Person,
    errorCode: string,
    message: string,
    journeyIsInconsistent: (journey: Journey) => boolean
): AuditForObject | undefined => {
    if (!person.journeys?.some((journey) => !journeySkipsTripDiary(journey) && journeyIsInconsistent(journey))) {
        return undefined;
    }
    return {
        objectType: 'person',
        objectUuid: person._uuid!,
        errorCode,
        version: 1,
        level: 'error',
        message,
        ignore: false
    };
};

export const personAuditChecks: { [errorCode: string]: PersonAuditCheckFunction } = {
    /**
     * Check if person age is missing
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_M_Age: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;
        const age = person.age;

        if (age === undefined || age === null) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_M_Age',
                version: 1,
                level: 'error',
                message: 'Person age is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for journey sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two journeys.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_L_InvalidJourneySequences: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;

        if (hasInvalidOrDuplicateSequences(person.journeys)) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_L_InvalidJourneySequences',
                version: 1,
                level: 'error',
                message: 'At least one journey sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if person age exceeds the configured maximum
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_I_AgeTooHigh: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;
        const age = person.age;

        if (typeof age === 'number' && age > projectConfig.ages.maxPersonAge) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_I_AgeTooHigh',
                version: 1,
                level: 'error',
                message: 'Person age is too high',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the journey sequences (e.g. 1,2,3,5,6). The questionnaire keeps
     * them contiguous when a journey is added or deleted, so a hole points at a survey bug
     * worth investigating rather than at unusable data.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_W_JourneySequenceGaps: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;

        if (hasSequenceGaps(person.journeys)) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_W_JourneySequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Journey sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Warning when person age is at or above `addAuditWarningVeryOldAge` but still within
     * `maxPersonAge` (see project config). Intended for reviewer verification.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_W_VeryOldAge: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;
        const age = person.age;
        const warningAge = projectConfig.ages.addAuditWarningVeryOldAge;

        if (
            typeof age === 'number' &&
            warningAge !== undefined &&
            age >= warningAge &&
            age <= projectConfig.ages.maxPersonAge
        ) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_W_VeryOldAge',
                version: 1,
                level: 'warning',
                message: 'Person is very old, please validate',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Error when `didTrips` was never answered, but a journey already holds
     * visited places or trips.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_L_MadeTripsUndefinedWithTrips: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        // TODO: skip when the survey does not ask didTrips (`fieldIsRequired('journey', 'didTrips')`).
        return personJourneyInconsistencyAudit(
            context.person,
            'P_L_MadeTripsUndefinedWithTrips',
            'Whether the person made trips is unanswered, but the journey has trips or visited places',
            (journey) => journeyDidTripsIsUnanswered(journey) && journeyHasDiaryContent(journey)
        );
    },

    /**
     * Error when `didTrips` is answered true, but the journey has neither trips nor visited places.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_L_MadeTripsWithEmptyJourney: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        return personJourneyInconsistencyAudit(
            context.person,
            'P_L_MadeTripsWithEmptyJourney',
            'The person made trips, but the journey has no trips or visited places',
            (journey) => getAnswerValue(journey.didTrips) === true && !journeyHasDiaryContent(journey)
        );
    },

    /**
     * Error when `didTrips` is answered false, but the journey has trips or visited places.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_L_didNotMakeTripsButTripsPresent: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        return personJourneyInconsistencyAudit(
            context.person,
            'P_L_didNotMakeTripsButTripsPresent',
            'The person did not make trips, but the journey has trips or visited places',
            (journey) => getAnswerValue(journey.didTrips) === false && journeyHasDiaryContent(journey)
        );
    },

    /**
     * Error when `didTrips` is dontKnow, but the journey has trips or visited places.
     * A dontKnow answer should not open the trip diary.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_L_MadeTripsUnknownWithTrips: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        return personJourneyInconsistencyAudit(
            context.person,
            'P_L_MadeTripsUnknownWithTrips',
            'Whether the person made trips is unknown, but the journey has trips or visited places',
            (journey) => journey.didTrips?.status === 'dont_know' && journeyHasDiaryContent(journey)
        );
    }
};
