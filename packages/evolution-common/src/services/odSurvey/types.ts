/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file contains types and constants that are used in the
// Origin-Destination questionnaire context, ie with journey, trips and segments

/**
 * Activities that do not involve a destination
 */
export const loopActivities = ['workOnTheRoad', 'leisureStroll'];

/**
 * Simple modes, ie individual modes that involve no or private vehicles and are
 * often used multiple times in a journey
 */
export const simpleModes = ['carDriver', 'walk', 'bicycle', 'bicycleElectric', 'kickScooterElectric'];

/**
 * Modes of transportation. The elements in this array can identify are meant to
 * differentiate between the various types of road user, the infrastructure
 * used, the potential payment types and what kind of organisation offers the
 * service, if any. These modes are for the questionnaire context and differ
 * from those of the base objects used in the enhancement process.
 */
export const modeValues = [
    // Active mode
    'walk',
    'bicycle',
    'bicycleElectric',
    'bicyclePassenger',
    'bicycleBikesharing',
    'bicycleBikesharingElectric',
    'kickScooterElectric',
    // Modes for disabilities
    'wheelchair',
    'mobilityScooter', // Electric wheelchair, mobility scooter, etc.
    'paratransit',
    // Private motorized modes
    'carDriver', // complementary type: CarType
    'carDriverCarsharing',
    'carPassenger',
    'motorcycle', // includes motorbike, scooter, moped, etc.
    'snowmobile',
    'privateBoat',
    'allTerrainVehicle', // ATV, quad, etc.
    // Transit modes
    'transitBus', // includes Bus Transit System (BTS) category C
    'transitBRT', // Bus Rapid Transit category B
    'transitSchoolBus', // for school lines managed by transit agencies
    'transitStreetCar', // category C
    'transitFerry', // Ferry, without a car
    'transitGondola', // category A
    'transitMonorail', // category A
    'transitRRT', // Rapid Rail Transit (metro, subway, aerial train), category A
    'transitLRT', // Light Rail Transit, category B
    'transitLRRT', // Light Rail Rapid Transit, category A
    'transitHSR', // High Speed Rail, category A
    'transitRegionalRail', // category A
    'transitOnDemand', // On demand services (bus, minivan, taxi), usually managed by transit agencies
    'transitTaxi', // Collective taxi
    'intercityBus',
    'intercityTrain',
    'schoolBus',
    'otherBus', // Private buses, like hired buses for events, groups, etc.
    'taxi',
    'ferryWithCar',
    'plane',
    'otherActiveMode', // Skateboard, kick scooter, rollerblade, etc.
    'other',
    'dontKnow',
    'preferNotToAnswer'
] as const;

export type Mode = (typeof modeValues)[number];

export const modePreValues = [
    'carDriver',
    'carPassenger',
    'walk',
    'bicycle',
    'transit',
    // FIXME Add separate transit light and heavy categories when we add configuration and support decent default configurations, otherwise, there would be too many modesPre/modes
    'taxi',
    'ferry',
    // Modes that may involve disability assistance
    'paratransit',
    // Other modes
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
    bicycleElectric: ['bicycle'],
    bicycleBikesharing: ['bicycle'],
    bicycleBikesharingElectric: ['bicycle'],
    kickScooterElectric: ['bicycle', 'other'],
    transitBus: ['transit'],
    transitBRT: ['transit'],
    transitSchoolBus: ['transit', 'other'],
    transitStreetCar: ['transit'],
    transitFerry: ['transit', 'other', 'ferry'],
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
    carDriverCarsharing: ['carDriver'],
    allTerrainVehicle: ['other'],
    snowmobile: ['other'],
    privateBoat: ['other', 'ferry'],
    transitTaxi: ['transit', 'taxi'],
    taxi: ['taxi'],
    paratransit: ['other', 'transit', 'paratransit'],
    wheelchair: ['walk', 'other'],
    mobilityScooter: ['walk', 'other'],
    plane: ['other'],
    otherActiveMode: ['other'],
    motorcycle: ['other'],
    ferryWithCar: ['other', 'ferry'],
    other: ['other'],
    dontKnow: ['dontKnow'],
    preferNotToAnswer: ['preferNotToAnswer']
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
