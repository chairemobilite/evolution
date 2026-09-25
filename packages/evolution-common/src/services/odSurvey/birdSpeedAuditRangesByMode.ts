/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Mode } from './types';

/**
 * Inclusive bird-speed bounds in km/h. `undefined` means the bound is not set yet.
 */
export type SpeedAuditRangeKph = [min: number | undefined, max: number | undefined];

/**
 * Two bird-speed bounds for one mode.
 * A speed outside `warning` but not outside `error` is a warning.
 * A speed outside `error` is an error.
 * Audits only: never used to show or hide questionnaire choices.
 */
export type BirdSpeedAuditRanges = {
    warning: SpeedAuditRangeKph;
    error: SpeedAuditRangeKph;
};

/** Bird speed is audited when the bird distance is strictly above this, in meters. */
export const minBirdDistanceMetersForSpeedAudit = 1000;

/** A duration of 0 is ignored when the bird distance is at most this, in meters. */
export const maxBirdDistanceMetersIgnoringZeroDuration = 2000;

/**
 * Walk and active modes are also audited when the bird distance is strictly below this, in meters.
 */
export const shortBirdDistanceMetersForActiveModeSpeedAudit = 500;

/**
 * Accepted trip duration, in minutes, below which a short trip is not flagged.
 * A longer duration up to `error` is a warning. A duration of `error` or more is an error.
 */
export const shortTripDurationMinutes = {
    /** Non-active modes, bird distance under 1 km. */
    nonActive: { warning: 15, error: 30 },
    /** Walk and active modes, bird distance under 500 m. */
    active: { warning: 15, error: 30 }
};

/**
 * Duration audit for a short trip.
 * A duration of 0 is ignored when the bird distance is 2 km or less.
 * Non-active modes under 1 km: under 15 min is accepted, 15 to 30 min is a warning, 30 min or more is an error.
 * Walk and active modes under 500 m: under 15 min is accepted, 15 to 30 min is a warning, 30 min or more is an error.
 * @param mode Declared mode used for the trip
 * @param distanceMeters Bird distance in meters
 * @param durationMinutes Trip duration in minutes
 */
export const shortTripDurationAuditLevel = (
    mode: Mode,
    distanceMeters: number,
    durationMinutes: number
): 'warning' | 'error' | undefined => {
    const active = activeModesAuditedOnShortDistance.includes(mode);
    const limits =
        active && distanceMeters < shortBirdDistanceMetersForActiveModeSpeedAudit
            ? shortTripDurationMinutes.active
            : !active && distanceMeters < minBirdDistanceMetersForSpeedAudit
                ? shortTripDurationMinutes.nonActive
                : undefined;
    if (durationMinutes <= 0 && distanceMeters <= maxBirdDistanceMetersIgnoringZeroDuration) {
        return undefined;
    }
    if (limits === undefined || durationMinutes < limits.warning) {
        return undefined;
    }
    return durationMinutes < limits.error ? 'warning' : 'error';
};

/** Walk and active modes, audited on short bird distances as well as on long ones. */
export const activeModesAuditedOnShortDistance: readonly Mode[] = [
    'walk',
    'bicycle',
    'bicycleElectric',
    'bicyclePassenger',
    'bicycleBikesharing',
    'bicycleBikesharingElectric',
    'kickScooterElectric',
    'otherActiveMode',
    'wheelchair'
];

/**
 * `error` when the speed is outside the error range.
 * `warning` when it is outside the warning range and still inside the error range.
 * A bound left `undefined` is not checked.
 * @param mode Declared mode used for the trip
 * @param speedKph Bird speed in km/h
 */
export const birdSpeedAuditLevel = (mode: Mode, speedKph: number): 'warning' | 'error' | undefined => {
    const ranges = birdSpeedAuditRangesByMode[mode];
    if (isOutsideRange(speedKph, ranges.error)) {
        return 'error';
    }
    if (isOutsideRange(speedKph, ranges.warning)) {
        return 'warning';
    }
    return undefined;
};

const isOutsideRange = (speedKph: number, [min, max]: SpeedAuditRangeKph): boolean =>
    (min !== undefined && speedKph < min) || (max !== undefined && speedKph > max);

/**
 * Bird-speed audit bounds by mode, in km/h.
 * Other audit checks should use the distance and the duration instead.
 */
export const birdSpeedAuditRangesByMode: Record<Mode, BirdSpeedAuditRanges> = {
    walk: { warning: [2, 10], error: [0.5, 15] },
    bicycle: { warning: [4, 25], error: [0.5, 40] },
    bicycleElectric: { warning: [4, 30], error: [0.5, 50] },
    bicyclePassenger: { warning: [4, 25], error: [0.5, 50] },
    bicycleBikesharing: { warning: [4, 25], error: [0.5, 40] },
    bicycleBikesharingElectric: { warning: [4, 30], error: [0.5, 50] },
    kickScooterElectric: { warning: [4, 30], error: [0.5, 50] },
    wheelchair: { warning: [1, 10], error: [0.5, 10] },
    mobilityScooter: { warning: [2, 25], error: [0.5, 40] },
    paratransit: { warning: [5, 60], error: [1, 100] },
    carDriver: { warning: [6, 120], error: [2, 150] },
    carDriverCarsharing: { warning: [6, 120], error: [2, 150] },
    carPassenger: { warning: [6, 120], error: [2, 150] },
    motorcycle: { warning: [6, 100], error: [2, 150] },
    snowmobile: { warning: [5, 70], error: [1, 100] },
    privateBoat: { warning: [2, 50], error: [0.5, 100] },
    allTerrainVehicle: { warning: [5, 60], error: [1, 100] },
    transitBus: { warning: [5, 50], error: [1, 100] },
    transitBRT: { warning: [5, 60], error: [1, 70] },
    transitSchoolBus: { warning: [5, 40], error: [1, 120] },
    transitStreetCar: { warning: [7, 40], error: [1, 100] },
    transitFerry: { warning: [2, 40], error: [0.5, 90] },
    transitGondola: { warning: [3, 40], error: [0.5, 50] },
    transitMonorail: { warning: [5, 50], error: [3, 120] },
    transitRRT: { warning: [3, 50], error: [1, 120] },
    transitLRT: { warning: [3, 60], error: [1, 100] },
    transitLRRT: { warning: [8, 100], error: [2, 150] },
    transitHSR: { warning: [30, 300], error: [10, 400] },
    transitRegionalRail: { warning: [10, 120], error: [5, 250] },
    transitOnDemand: { warning: [5, 80], error: [1, 100] },
    transitTaxi: { warning: [5, 80], error: [2, 150] },
    intercityBus: { warning: [15, 90], error: [5, 120] },
    intercityTrain: { warning: [20, 200], error: [5, 350] },
    schoolBus: { warning: [5, 80], error: [1, 120] },
    otherBus: { warning: [5, 110], error: [1, 120] },
    taxi: { warning: [6, 110], error: [2, 150] },
    ferryWithCar: { warning: [2, 40], error: [0.5, 90] },
    plane: { warning: [60, 1000], error: [15, 1200] },
    otherActiveMode: { warning: [2, 25], error: [0.5, 50] },
    other: { warning: [2, 100], error: [0.5, 1200] },
    dontKnow: { warning: [2, 100], error: [0.5, 1200] },
    preferNotToAnswer: { warning: [2, 100], error: [0.5, 1200] }
};
