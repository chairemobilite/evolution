/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Mode } from '../baseObjects/attributeTypes/SegmentAttributes';

/**
 * Activities that do not involve a destination
 */
export const loopActivities = ['workOnTheRoad', 'leisureStroll'];

/**
 * Simple modes, ie individual modes that involve no or private vehicles and are
 * often used multiple times in a journey
 */
export const simpleModes = ['carDriver', 'walk', 'bicycle', 'bicycleElectric', 'scooterElectric'];

type ModePre = 'carDriver' | 'carPassenger' | 'walk' | 'bicycle' | 'transit' | 'taxi' | 'other' | 'dontKnow';

export const modeToModePreMap: { [mode in Mode]: ModePre[] } = {
    walk: ['walk'],
    bicycle: ['bicycle'],
    bicycleElectric: ['bicycle'],
    bicycleBikesharing: ['bicycle'],
    bicycleBikesharingElectric: ['bicycle'],
    bicyclePassenger: ['bicycle'],
    scooterElectric: ['bicycle', 'other'],
    transitBus: ['transit'],
    transitBRT: ['transit'],
    transitSchoolBus: ['transit', 'other'],
    transitStreetCar: ['transit'],
    transitFerry: ['transit', 'other'],
    transitGondola: ['transit'],
    transitMonorail: ['transit'],
    transitRRT: ['transit'],
    transitLRT: ['transit'],
    transitLRRT: ['transit'],
    transitHSR: ['transit'],
    transitRegionalRail: ['transit'],
    intercityBus: ['transit'],
    intercityTrain: ['transit'],
    transitOnDemand: ['transit'],
    schoolBus: ['transit', 'other'],
    otherBus: ['other'],
    carDriverPersonal: ['carDriver'],
    carPassenger: ['carPassenger'],
    carDriverRental: ['carDriver'],
    carDriverCarsharingStationBased: ['carDriver'],
    carDriverCarsharingFreeFloating: ['carDriver'],
    carDriverCarsharingUnspecified: ['carDriver'],
    transitTaxi: ['transit', 'taxi'],
    taxi: ['taxi'],
    paratransit: ['other', 'transit'],
    wheelchair: ['walk'],
    mobilityScooter: ['walk', 'other'],
    plane: ['other'],
    otherActiveMode: ['other'],
    motorcycle: ['other'],
    ferryWithCar: ['other'],
    other: ['other'],
    dontKnow: ['dontKnow'],
};

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
    {} as { [modePre in ModePre]: Mode[] }
);
