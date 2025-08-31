/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file contains types and constants that are used in the
// Origin-Destination survey context, ie with journey, trips and segments

import { Mode } from '../baseObjects/attributeTypes/SegmentAttributes';

/**
 * Activities that do not involve a destination
 */
export const loopActivities = ['workOnTheRoad', 'leisureStroll'];

/**
 * Simple modes, ie individual modes that involve no or private vehicles and are
 * often used multiple times in a journey
 */
export const simpleModes = ['carDriver', 'walk', 'bicycle', 'bicycleElectric', 'kickScooterElectric'];

const modePreValues = [
    'carDriver',
    'carPassenger',
    'walk',
    'bicycle',
    'transit',
    'taxi',
    'other',
    'dontKnow',
    'preferNotToAnswer'
] as const;
export type ModePre = (typeof modePreValues)[number];

/**
 * Map each mode to the mode categories under which they should appear
 */
export const modeToModePreMap: { [mode in Mode]: ModePre[] } = {
    walk: ['walk'],
    bicycle: ['bicycle'],
    bicyclePassenger: ['bicycle'],
    kickScooterElectric: ['bicycle', 'other'],
    transitBus: ['transit'],
    transitBRT: ['transit'],
    transitSchoolBus: ['transit', 'other'],
    transitStreetCar: ['transit'],
    transitFerry: ['transit', 'other'],
    transitGondola: ['transit', 'other'],
    transitMonorail: ['transit'],
    transitRRT: ['transit'],
    transitLRT: ['transit'],
    transitLRRT: ['transit'],
    transitHSR: ['transit'],
    transitRegionalRail: ['transit'],
    intercityBus: ['transit'],
    intercityTrain: ['transit'],
    transitOnDemand: ['transit', 'other'],
    schoolBus: ['transit', 'other'],
    otherBus: ['other'],
    carDriver: ['carDriver'],
    carPassenger: ['carPassenger'],
    transitTaxi: ['transit', 'taxi'],
    taxi: ['taxi'],
    paratransit: ['other', 'transit'],
    wheelchair: ['walk', 'other'],
    mobilityScooter: ['walk', 'other'],
    plane: ['other'],
    otherActiveMode: ['other'],
    motorcycle: ['other'],
    ferryWithCar: ['other'],
    other: ['other'],
    dontKnow: ['dontKnow'],
    preferNotToAnswer: []
};

/**
 * Map each mode category to the modes that belong to it, it is the reverse of
 * the modeToModePreMap
 */
export const modePreToModeMap: { [modePre in ModePre]: Mode[] } = Object.entries(modeToModePreMap).reduce(
    (acc, [mode, modePres]) => {
        modePres.forEach((modePre) => {
            if (!acc[modePre]) {
                acc[modePre] = [];
            }
            acc[modePre].push(mode as Mode);
        });
        return acc;
    },
    modePreValues.reduce((acc, modePre) => {
        acc[modePre] = [];
        return acc;
    }, {}) as { [key in ModePre]: Mode[] }
);
