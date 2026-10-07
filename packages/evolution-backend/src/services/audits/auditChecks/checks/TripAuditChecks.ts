/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { hasInvalidOrDuplicateSequences } from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import {
    activeModesAuditedOnShortDistance,
    birdSpeedAuditApplies,
    birdSpeedAuditLevel,
    birdSpeedAuditRangesByMode,
    shortTripDurationAuditLevel,
    zeroDurationIsIgnored
} from './birdSpeedAuditRangesByMode';
import { loopActivities, type Mode } from 'evolution-common/lib/services/odSurvey/types';
import type { TripAuditCheckContext, TripAuditCheckFunction } from '../AuditCheckContexts';

/**
 * Modes of the trip, in segment order.
 * A mode missing from the range map is left out, so the speed lookup always finds a range.
 * @param trip Trip being audited
 */
const modesForBirdSpeedAudit = (trip: Trip): Mode[] =>
    trip.getModes().filter((mode) => mode !== undefined && Object.hasOwn(birdSpeedAuditRangesByMode, mode));

/**
 * Warning or error when the bird speed is outside the combined mode range.
 * The range uses the lowest minimum and the highest maximum of the modes.
 * Plane or an intercity mode keeps only those bounds.
 * Active modes are audited above 500 m. Other modes are audited above 1 km.
 * A duration of 0 is ignored up to 1 km, or up to 5 km for car and motorcycle, and is an error beyond that.
 * @param context Trip audit context
 */
const birdSpeedAudit = (context: TripAuditCheckContext): 'warning' | 'error' | undefined => {
    const { trip } = context;
    const distanceMeters = trip.getBirdDistanceMeters();
    const durationSeconds = trip.getDurationSeconds();
    const speedKph = trip.getBirdSpeedKph();
    const modes = modesForBirdSpeedAudit(trip);
    if (distanceMeters === undefined || modes.length === 0) {
        return undefined;
    }
    if (durationSeconds === 0) {
        return modes.every((mode) => zeroDurationIsIgnored(mode, distanceMeters)) ? undefined : 'error';
    }
    if (speedKph === undefined || !modes.some((mode) => birdSpeedAuditApplies(mode, distanceMeters))) {
        return undefined;
    }
    return birdSpeedAuditLevel(modes, speedKph);
};

/**
 * Warning or error when a short trip lasts too long.
 * Non-active modes up to 1 km, and walk or active modes up to 500 m.
 * One non-active segment selects the 1 km threshold, the larger of the two.
 * @param context Trip audit context
 */
const shortTripDurationAudit = (context: TripAuditCheckContext): 'warning' | 'error' | undefined => {
    const { trip } = context;
    const distanceMeters = trip.getBirdDistanceMeters();
    const durationSeconds = trip.getDurationSeconds();
    const modes = modesForBirdSpeedAudit(trip);
    // The threshold is the larger distance. One non-active segment selects 1 km.
    // A trip whose modes are all active keeps the 500 m rule.
    const mode = modes.find((candidate) => !activeModesAuditedOnShortDistance.includes(candidate)) ?? modes[0];
    if (distanceMeters === undefined || durationSeconds === undefined || mode === undefined) {
        return undefined;
    }
    return shortTripDurationAuditLevel(mode, distanceMeters, durationSeconds / 60);
};

export const tripAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
    /**
     * Check if trip segments are missing.
     * The trip that arrives at a loop activity has segments, so this check still runs for it.
     * The trip that leaves a loop activity has no segments, so this check does not run when the origin is a loop activity.
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_M_Segments: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;

        if (loopActivities.some((loopActivity) => loopActivity === trip.origin?.activity)) {
            return undefined;
        }

        const hasSegments = trip.segments !== undefined && trip.segments.length > 0;

        if (!hasSegments) {
            return {
                objectType: 'trip',
                objectUuid: trip._uuid!,
                errorCode: 'T_M_Segments',
                version: 1,
                level: 'error',
                message: 'Trip segments are missing',
                ignore: false
            };
        }

        return undefined;
    },

    /**
     * Flag a trip that is not attached to both its origin and destination.
     *
     * TripFactory only assigns `origin` / `destination` when it finds the place
     * for `_originVisitedPlaceUuid` / `_destinationVisitedPlaceUuid`. An unattached
     * end can mean a missing answer or a place the factory could not resolve.
     *
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_M_OriginOrDestination: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;

        if (trip.origin && trip.destination) {
            return undefined;
        }

        return {
            objectType: 'trip',
            objectUuid: trip._uuid!,
            errorCode: 'T_M_OriginOrDestination',
            version: 1,
            level: 'error',
            message: 'Trip is missing origin or destination',
            ignore: false
        };
    },

    /**
     * Flag a trip whose last segment does not close the chain (`hasNextMode === false`).
     *
     * Fires only on the explicit `false` of `trip.isSegmentChainClosed`.
     *
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_L_TripSegmentsNotClosed: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;

        if (trip.isSegmentChainClosed !== false) {
            return undefined;
        }

        return {
            objectType: 'trip',
            objectUuid: trip._uuid!,
            errorCode: 'T_L_TripSegmentsNotClosed',
            version: 1,
            level: 'error',
            message: 'Trip segment chain is not closed',
            ignore: false
        };
    },

    /**
     * Flag a trip with more than one segment answering `hasNextMode === false`.
     *
     * Fires only on the explicit `true` of `trip.isSegmentChainClosedMoreThanOnce`.
     *
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_L_TripSegmentsClosedMoreThanOnce: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;

        if (trip.isSegmentChainClosedMoreThanOnce !== true) {
            return undefined;
        }

        return {
            objectType: 'trip',
            objectUuid: trip._uuid!,
            errorCode: 'T_L_TripSegmentsClosedMoreThanOnce',
            version: 1,
            level: 'error',
            message: 'Trip segment chain is closed more than once',
            ignore: false
        };
    },

    /**
     * Check for segment sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two segments.
     *
     * There is no matching gap warning for segments, unlike the other survey objects:
     * TripFactory drops the implicit walking segments of a multimode trip, so the segments
     * left on the trip legitimately have holes (`walk 1, bus 2, walk 3` keeps only `bus 2`).
     * TripFactory skips that filtering when this check would fail, so duplicate and invalid
     * raw sequences still reach us here.
     *
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_L_InvalidSegmentSequences: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;

        if (hasInvalidOrDuplicateSequences(trip.segments)) {
            return {
                objectType: 'trip',
                objectUuid: trip._uuid!,
                errorCode: 'T_L_InvalidSegmentSequences',
                version: 1,
                level: 'error',
                message: 'At least one segment sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Bird speed is outside the usual range for the mode, but not impossible.
     * Trips longer than 1 km, and walk or active modes below 500 m.
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_W_SpeedNotInRange: (context: TripAuditCheckContext): AuditForObject | undefined => {
        if (birdSpeedAudit(context) !== 'warning') {
            return undefined;
        }
        return {
            objectType: 'trip',
            objectUuid: context.trip._uuid!,
            errorCode: 'T_W_SpeedNotInRange',
            version: 1,
            level: 'warning',
            message: 'Bird speed is unusual for the declared mode',
            ignore: false
        };
    },

    /**
     * Bird speed is outside the possible range for the mode.
     * Trips longer than 1 km, and walk or active modes below 500 m.
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_L_SpeedNotInRange: (context: TripAuditCheckContext): AuditForObject | undefined => {
        if (birdSpeedAudit(context) !== 'error') {
            return undefined;
        }
        return {
            objectType: 'trip',
            objectUuid: context.trip._uuid!,
            errorCode: 'T_L_SpeedNotInRange',
            version: 1,
            level: 'error',
            message: 'Bird speed is impossible for the declared mode',
            ignore: false
        };
    },

    /**
     * A short trip lasts longer than usual for its mode.
     * Non-active modes up to 1 km, and walk or active modes up to 500 m.
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_W_ShortTripDuration: (context: TripAuditCheckContext): AuditForObject | undefined => {
        if (shortTripDurationAudit(context) !== 'warning') {
            return undefined;
        }
        return {
            objectType: 'trip',
            objectUuid: context.trip._uuid!,
            errorCode: 'T_W_ShortTripDuration',
            version: 1,
            level: 'warning',
            message: 'Trip duration is long for this short distance',
            ignore: false
        };
    },

    /**
     * A short trip lasts too long for its mode.
     * Non-active modes up to 1 km, and walk or active modes up to 500 m.
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_L_ShortTripDuration: (context: TripAuditCheckContext): AuditForObject | undefined => {
        if (shortTripDurationAudit(context) !== 'error') {
            return undefined;
        }
        return {
            objectType: 'trip',
            objectUuid: context.trip._uuid!,
            errorCode: 'T_L_ShortTripDuration',
            version: 1,
            level: 'error',
            message: 'Trip duration is too long for this short distance',
            ignore: false
        };
    }
};
