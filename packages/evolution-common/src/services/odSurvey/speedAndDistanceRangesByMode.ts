/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Mode } from './types';

/**
 * Bird-distance and bird-speed ranges by mode.
 *
 * Questionnaire filter (show/hide mode and modePre choices): only the
 * **minimum** of {@link birdDistanceMRangeByMode}, via
 * {@link isModeOfferedForBirdDistance}. Walk, bicycle, car, etc. have min 0
 * so they stay visible on long trips.
 *
 * Audits re-check **min and max** of {@link birdDistanceMRangeByMode}, plus
 * {@link birdSpeedKphRangeByMode} and the bands in
 * `birdSpeedKmhValidRangeByModeAndDistance`. The UI filter is not a guarantee:
 * a mode that was hidden can still appear in saved answers (tampered interview
 * JSON, custom request). Audits flag those as reviewer warnings.
 */

/** Inclusive min and max, in the unit of the table. `Infinity` is allowed for max. */
export type MinMaxRange = [min: number, max: number];

/**
 * Bird-speed range in km/h by mode. Audits only: never used to show or hide
 * questionnaire choices (e.g. bicycleElectric max 30 km/h is a warning).
 */
export const birdSpeedKphRangeByMode: Partial<Record<Mode, MinMaxRange>> = {
    walk: [2, 10],
    bicycle: [4, 25],
    bicycleElectric: [4, 30],
    bicyclePassenger: [4, 25],
    bicycleBikesharing: [4, 25],
    bicycleBikesharingElectric: [4, 30],
    kickScooterElectric: [4, 30],
    wheelchair: [1, 10],
    mobilityScooter: [2, 25],
    paratransit: [10, 60],
    carDriver: [10, 120],
    carDriverCarsharing: [10, 120],
    carPassenger: [10, 120],
    motorcycle: [20, 100],
    snowmobile: [10, 80],
    privateBoat: [5, 40],
    allTerrainVehicle: [10, 80],
    transitBus: [7, 50],
    transitBRT: [10, 60],
    transitSchoolBus: [5, 40],
    transitStreetCar: [7, 40],
    transitFerry: [5, 40],
    transitGondola: [5, 40],
    transitMonorail: [15, 50],
    transitRRT: [15, 50],
    transitLRT: [15, 60],
    transitLRRT: [30, 150],
    transitHSR: [40, 300],
    transitRegionalRail: [30, 150],
    transitOnDemand: [10, 80],
    transitTaxi: [10, 80],
    intercityBus: [30, 110],
    intercityTrain: [40, 200],
    schoolBus: [5, 110],
    otherBus: [10, 110],
    taxi: [10, 120],
    ferryWithCar: [5, 40],
    plane: [100, 1200],
    otherActiveMode: [2, 25],
    other: [2, 100],
    dontKnow: [2, 100],
    preferNotToAnswer: [2, 100]
};

/**
 * Bird-distance range in meters by mode.
 * Questionnaire filter: only `min` hides a choice (plane below 100 km,
 * ferry below 100 m, intercity below 5 km). Audits use **min and max**:
 * walk stays offered beyond 3000 m, but a saved walk at 8 km (or a plane
 * on a 2 km trip written outside the UI) is a reviewer warning.
 */
export const birdDistanceMRangeByMode: Partial<Record<Mode, MinMaxRange>> = {
    walk: [0, 3000],
    bicycle: [0, 40000],
    bicycleElectric: [0, 50000],
    bicyclePassenger: [0, 40000],
    bicycleBikesharing: [0, 15000],
    bicycleBikesharingElectric: [0, 20000],
    kickScooterElectric: [0, 15000],
    wheelchair: [0, 3000],
    mobilityScooter: [0, 5000],
    paratransit: [0, 40000],
    carDriver: [0, 1000000],
    carDriverCarsharing: [0, 1000000],
    carPassenger: [0, 1000000],
    motorcycle: [0, 1000000],
    snowmobile: [0, 200000],
    privateBoat: [100, 50000],
    allTerrainVehicle: [0, 200000],
    transitBus: [100, 100000],
    transitBRT: [100, 100000],
    transitSchoolBus: [200, 20000],
    transitStreetCar: [200, 40000],
    transitFerry: [100, 50000],
    transitGondola: [200, 20000],
    transitMonorail: [250, 40000],
    transitRRT: [250, 40000],
    transitLRT: [250, 40000],
    transitLRRT: [250, 40000],
    transitHSR: [250, 1000000],
    transitRegionalRail: [500, 40000],
    transitOnDemand: [0, 40000],
    transitTaxi: [0, 40000],
    intercityBus: [5000, Infinity],
    intercityTrain: [5000, Infinity],
    schoolBus: [200, 1000000],
    otherBus: [500, 1000000],
    taxi: [0, 50000],
    ferryWithCar: [100, 500000],
    plane: [100000, Infinity],
    otherActiveMode: [0, 5000],
    other: [0, Infinity],
    dontKnow: [0, Infinity],
    preferNotToAnswer: [0, Infinity]
};

/**
 * Always offered in the questionnaire, regardless of bird distance.
 * FIXME Consider exposing this on SegmentSectionConfiguration if a survey
 * needs to override the list.
 */
export const modesAlwaysOfferedForBirdDistance: readonly Mode[] = ['other', 'dontKnow', 'preferNotToAnswer'];

/**
 * Questionnaire filter: whether to show this mode for the trip bird distance.
 * Uses only `birdDistanceMRangeByMode` min. Does not use max or any speed
 * table. Unknown distance or missing range: offer the mode.
 * `other`, `dontKnow` and `preferNotToAnswer` are never hidden by distance.
 * Audits still re-check min (and max) on saved answers; this function is UI only.
 * @param mode questionnaire mode
 * @param birdDistanceMeters trip origin-destination bird distance, if known
 */
export const isModeOfferedForBirdDistance = (mode: Mode, birdDistanceMeters: number | undefined): boolean => {
    if (modesAlwaysOfferedForBirdDistance.includes(mode) || birdDistanceMeters === undefined) {
        return true;
    }
    const range = birdDistanceMRangeByMode[mode];
    if (range === undefined) {
        return true;
    }
    return birdDistanceMeters >= range[0];
};

/**
 * Questionnaire filter for a modePre category: offered if at least one of
 * its modes passes {@link isModeOfferedForBirdDistance}. Empty category: hidden.
 * @param modesInCategory modes that belong to the category
 * @param birdDistanceMeters trip origin-destination bird distance, if known
 */
export const isModePreOfferedForBirdDistance = (
    modesInCategory: readonly Mode[],
    birdDistanceMeters: number | undefined
): boolean => modesInCategory.some((mode) => isModeOfferedForBirdDistance(mode, birdDistanceMeters));

/**
 * Audits only: whether bird distance is inside `[min, max]` (both bounds).
 * Rechecks min even when the questionnaire would have hidden the mode, because
 * saved answers can bypass the UI. Not used to show or hide choices.
 * @param mode questionnaire mode
 * @param birdDistanceMeters trip bird distance in meters
 */
export const isBirdDistanceInRangeForMode = (mode: Mode, birdDistanceMeters: number): boolean => {
    const range = birdDistanceMRangeByMode[mode];
    if (range === undefined) {
        return true;
    }
    return birdDistanceMeters >= range[0] && birdDistanceMeters <= range[1];
};

/**
 * Audits only: whether bird speed is inside `birdSpeedKphRangeByMode`.
 * Not used to show or hide questionnaire choices.
 * @param mode questionnaire mode
 * @param birdSpeedKph trip bird speed in km/h
 */
export const isBirdSpeedInRangeForMode = (mode: Mode, birdSpeedKph: number): boolean => {
    const range = birdSpeedKphRangeByMode[mode];
    if (range === undefined) {
        return true;
    }
    return birdSpeedKph >= range[0] && birdSpeedKph <= range[1];
};
