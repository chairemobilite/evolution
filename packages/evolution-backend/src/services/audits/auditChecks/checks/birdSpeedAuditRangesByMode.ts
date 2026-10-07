/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Mode } from 'evolution-common/lib/services/odSurvey/types';

/**
 * Inclusive bird-speed bounds in km/h. `undefined` means the bound is not set yet.
 */
type SpeedAuditRangeKph = [min: number | undefined, max: number | undefined];

/**
 * Two bird-speed bounds for one mode.
 * A speed outside `warning` but not outside `error` is a warning.
 * A speed outside `error` is an error.
 * Audits only: never used to show or hide questionnaire choices.
 */
type BirdSpeedAuditRanges = {
    warning: SpeedAuditRangeKph;
    error: SpeedAuditRangeKph;
};

/**
 * Boundary between the short-duration audit and the speed audit for a non-active mode, in meters.
 * Speed is audited strictly above this. The short-duration audit applies at this distance and below.
 */
const minBirdDistanceMetersForSpeedAudit = 1000;

/**
 * Boundary between the short-duration audit and the speed audit for an active mode, in meters.
 * Speed is audited strictly above this. The short-duration audit applies at this distance and below.
 */
const minBirdDistanceMetersForActiveModeSpeedAudit = 500;

/** A duration of 0 is ignored up to this bird distance, in meters. Car and motorcycle use a longer limit. */
const zeroDurationIgnoredUpToMeters = 1000;

/** Car and motorcycle: a duration of 0 is ignored up to this bird distance, in meters. */
const zeroDurationIgnoredUpToMetersForCar = 5000;

/**
 * Accepted trip duration, in minutes, below which a short trip is not flagged.
 * The same bounds apply to every short trip. Only the distance cutoff changes with the mode.
 * A longer duration up to `error` is a warning. A duration of `error` or more is an error.
 */
const shortTripDurationMinutes = {
    /** Non-active modes, bird distance up to 1 km. */
    nonActive: { warning: 20, error: 45 },
    /** Walk and active modes, bird distance up to 500 m. */
    active: { warning: 20, error: 45 }
};

/**
 * Duration audit for a short trip.
 * A duration of 0 is ignored up to 1 km, or up to 5 km for car and motorcycle.
 * Under 20 min is accepted, 20 to 45 min is a warning, 45 min or more is an error.
 * Non-active modes use these bounds up to 1 km. Walk and active modes use them up to 500 m.
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
        active && distanceMeters <= minBirdDistanceMetersForActiveModeSpeedAudit
            ? shortTripDurationMinutes.active
            : !active && distanceMeters <= minBirdDistanceMetersForSpeedAudit
                ? shortTripDurationMinutes.nonActive
                : undefined;
    if (durationMinutes <= 0 && zeroDurationIsIgnored(mode, distanceMeters)) {
        return undefined;
    }
    if (limits === undefined || durationMinutes < limits.warning) {
        return undefined;
    }
    return durationMinutes < limits.error ? 'warning' : 'error';
};

/** Walk and active modes. The speed audit starts above 500 m. At 500 m and below, the short-duration audit applies. */
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

/** Same zero-duration limit and the same bird-speed bounds as the car modes. */
const carAndMotorcycleModes: readonly Mode[] = ['carDriver', 'carDriverCarsharing', 'carPassenger', 'motorcycle'];

/**
 * A duration of 0 is ignored for short distances since we accept same departure time as the previous arrival time for short trips and activities.
 * Car threshold sitance for accepting 0 duration is larger than other modes since car trips are usually faster than most other modes.
 * A longer distance is an error in the speed audit.
 * @param mode Declared mode used for the trip
 * @param distanceMeters Bird distance in meters
 * @returns {boolean} True when a duration of 0 should not be flagged
 */
export const zeroDurationIsIgnored = (mode: Mode, distanceMeters: number): boolean =>
    distanceMeters <=
    (carAndMotorcycleModes.includes(mode) ? zeroDurationIgnoredUpToMetersForCar : zeroDurationIgnoredUpToMeters);

/**
 * Whether the bird-speed audit applies at this distance.
 * Active modes are audited strictly above 500 m. Other modes are audited strictly above 1 km.
 * @param mode Declared mode used for the trip
 * @param distanceMeters Bird distance in meters
 * @returns {boolean} True when the speed audit should run
 */
export const birdSpeedAuditApplies = (mode: Mode, distanceMeters: number): boolean =>
    distanceMeters >
    (activeModesAuditedOnShortDistance.includes(mode)
        ? minBirdDistanceMetersForActiveModeSpeedAudit
        : minBirdDistanceMetersForSpeedAudit);

/** Plane and intercity modes. A trip that uses one of them ignores the other modes' bounds. */
const longDistanceModes: readonly Mode[] = ['plane', 'intercityBus', 'intercityTrain', 'transitHSR'];

/**
 * Modes whose bounds apply. Plane or intercity modes replace the local modes.
 * Several long-distance modes still combine with each other.
 * @param modes Modes in trip order
 */
const modesForSpeedBounds = (modes: readonly Mode[]): readonly Mode[] => {
    const longDistance = modes.filter((mode) => longDistanceModes.includes(mode));
    return longDistance.length > 0 ? longDistance : modes;
};

/**
 * `error` when the speed is outside the combined error range.
 * `warning` when it is outside the combined warning range and still inside the error range.
 * Each range uses the lowest minimum and the highest maximum of the modes.
 * Plane or an intercity mode keeps only those bounds.
 * A bound left `undefined` is not checked.
 * @param modes Modes in trip order
 * @param speedKph Bird speed in km/h
 */
export const birdSpeedAuditLevel = (modes: readonly Mode[], speedKph: number): 'warning' | 'error' | undefined => {
    const modesForBounds = modesForSpeedBounds(modes);
    if (isOutsideRange(speedKph, combinedSpeedAuditRange(modesForBounds, 'error'))) {
        return 'error';
    }
    if (isOutsideRange(speedKph, combinedSpeedAuditRange(modesForBounds, 'warning'))) {
        return 'warning';
    }
    return undefined;
};

const isOutsideRange = (speedKph: number, [min, max]: SpeedAuditRangeKph): boolean =>
    (min !== undefined && speedKph < min) || (max !== undefined && speedKph > max);

/**
 * Lowest minimum and highest maximum of one bound across the modes.
 * The same mode repeated keeps that mode's bounds. A missing bound is skipped.
 * @param modes Modes in trip order
 * @param bound Warning bounds or error bounds
 */
const combinedSpeedAuditRange = (modes: readonly Mode[], bound: 'warning' | 'error'): SpeedAuditRangeKph => {
    let minimum: number | undefined;
    let maximum: number | undefined;
    for (const mode of modes) {
        const [modeMinimum, modeMaximum] = birdSpeedAuditRangesByMode[mode][bound];
        if (modeMinimum !== undefined && (minimum === undefined || modeMinimum < minimum)) {
            minimum = modeMinimum;
        }
        if (modeMaximum !== undefined && (maximum === undefined || modeMaximum > maximum)) {
            maximum = modeMaximum;
        }
    }
    return [minimum, maximum];
};

/** Bird-speed bounds shared by car driver, car passenger, carsharing and motorcycle, in km/h. */
const carBirdSpeedAuditRanges: BirdSpeedAuditRanges = { warning: [6, 120], error: [2, 150] };

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
    carDriver: carBirdSpeedAuditRanges,
    carDriverCarsharing: carBirdSpeedAuditRanges,
    carPassenger: carBirdSpeedAuditRanges,
    motorcycle: carBirdSpeedAuditRanges,
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
