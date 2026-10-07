/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Mode } from './types';

/**
 * Minimum bird distance, in meters, at which the questionnaire offers a mode.
 * Walk, bicycle and car stay at 0, so they remain visible on long trips.
 * Plane starts at 100 km, ferry at 100 m, intercity modes at 5 km.
 * A missing entry offers the mode.
 */
export const minBirdDistanceMetersByMode: Partial<Record<Mode, number>> = {
    walk: 0,
    bicycle: 0,
    bicycleElectric: 0,
    bicyclePassenger: 0,
    bicycleBikesharing: 0,
    bicycleBikesharingElectric: 0,
    kickScooterElectric: 0,
    wheelchair: 0,
    mobilityScooter: 0,
    paratransit: 0,
    carDriver: 0,
    carDriverCarsharing: 0,
    carPassenger: 0,
    motorcycle: 0,
    snowmobile: 0,
    privateBoat: 100,
    allTerrainVehicle: 0,
    transitBus: 100,
    transitBRT: 100,
    transitSchoolBus: 200,
    transitStreetCar: 200,
    transitFerry: 100,
    transitGondola: 200,
    transitMonorail: 250,
    transitRRT: 250,
    transitLRT: 250,
    transitLRRT: 250,
    transitHSR: 250,
    transitRegionalRail: 500,
    transitOnDemand: 0,
    transitTaxi: 0,
    intercityBus: 5000,
    intercityTrain: 5000,
    schoolBus: 200,
    otherBus: 500,
    taxi: 0,
    ferryWithCar: 100,
    plane: 100000,
    otherActiveMode: 0,
    other: 0,
    dontKnow: 0,
    preferNotToAnswer: 0
};

/**
 * Always offered in the questionnaire, regardless of bird distance.
 * FIXME Consider exposing this on SegmentSectionConfiguration if a survey
 * needs to override the list.
 */
export const modesAlwaysOfferedForBirdDistance: readonly Mode[] = ['other', 'dontKnow', 'preferNotToAnswer'];

/**
 * Whether to show this mode for the trip bird distance.
 * Uses {@link minBirdDistanceMetersByMode}. Unknown distance or a missing entry offers the mode.
 * `other`, `dontKnow` and `preferNotToAnswer` are never hidden by distance.
 * @param mode questionnaire mode
 * @param birdDistanceMeters trip origin-destination bird distance, if known
 */
export const isModeOfferedForBirdDistance = (mode: Mode, birdDistanceMeters: number | undefined): boolean => {
    if (modesAlwaysOfferedForBirdDistance.includes(mode) || birdDistanceMeters === undefined) {
        return true;
    }
    const minMeters = minBirdDistanceMetersByMode[mode];
    if (minMeters === undefined) {
        return true;
    }
    return birdDistanceMeters >= minMeters;
};

/**
 * Whether a modePre category is offered. True when at least one of its modes
 * passes {@link isModeOfferedForBirdDistance}. An empty category is hidden.
 * @param modesInCategory modes that belong to the category
 * @param birdDistanceMeters trip origin-destination bird distance, if known
 */
export const isModePreOfferedForBirdDistance = (
    modesInCategory: readonly Mode[],
    birdDistanceMeters: number | undefined
): boolean => modesInCategory.some((mode) => isModeOfferedForBirdDistance(mode, birdDistanceMeters));
