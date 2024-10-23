/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Modes of transportation. These are the basic modes
 *
 * TODO many of those modes have supplementary questions that will be asked to
 * get more details on the information, eg. carDriver and bicycle They are
 * currently all specified separately here
 *
 * TODO Add autonomous car type
 */
export const modeValues = [
    'walk',
    'bicycle',
    'bicycleElectric',
    'bicycleBikesharing',
    'bicycleBikesharingElectric',
    'bicyclePassenger',
    'scooterElectric',
    'carDriverPersonal',
    'carDriverRental',
    'carDriverCarsharingStationBased',
    'carDriverCarsharingFreeFloating',
    'carDriverCarsharingUnspecified',
    'carPassenger',
    'transitBus', // includes Bus Transit System (BTS) category C
    'transitBRT', // Bus Rapid Transit category B
    'transitSchoolBus', // for school lines managed by transit agencies
    'transitStreetCar', // category C
    'transitFerry', // Ferry, without a car
    'transitGondola', // category A
    'transitMonorail', // category A
    'transitRRT', // Rapid Rail Transit (metro, submway, aerial train), category A
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
    'paratransit',
    'wheelchair',
    'mobilityScooter', // Electric wheelchair, mobility scooter, etc.
    'motorcycle', // includes motorbike, scooter, moped, etc.
    'ferryWithCar',
    'plane',
    'otherActiveMode', // Skateboard, kick scooter, rollerblade, etc.
    'other',
    'dontKnow'
] as const;

export type Mode = (typeof modeValues)[number];

export const mapModeToModeCategory: { [mode in Mode]: ModeCategory } = {
    walk: 'walk',
    bicycle: 'bicycle',
    bicycleElectric: 'bicycle',
    bicycleBikesharing: 'bicycle',
    bicycleBikesharingElectric: 'bicycle',
    bicyclePassenger: 'bicycle',
    scooterElectric: 'bicycle',
    transitBus: 'transit',
    transitBRT: 'transit',
    transitSchoolBus: 'schoolBus', // TODO: decide  if we should use schoolBus or transit here.
    transitStreetCar: 'transit',
    transitFerry: 'transit',
    transitGondola: 'transit',
    transitMonorail: 'transit',
    transitRRT: 'transit',
    transitLRT: 'transit',
    transitLRRT: 'transit',
    transitHSR: 'transit',
    transitRegionalRail: 'transit',
    transitOnDemand: 'transit',
    intercityBus: 'transit',
    intercityTrain: 'transit',
    schoolBus: 'schoolBus',
    otherBus: 'other',
    carDriverPersonal: 'carDriver',
    carDriverRental: 'carDriver',
    carDriverCarsharingStationBased: 'carDriver',
    carDriverCarsharingFreeFloating: 'carDriver',
    carDriverCarsharingUnspecified: 'carDriver',
    carPassenger: 'carPassenger',
    transitTaxi: 'transit',
    taxi: 'taxi',
    paratransit: 'other',
    wheelchair: 'walk',
    mobilityScooter: 'walk',
    plane: 'other',
    otherActiveMode: 'other',
    motorcycle: 'other',
    ferryWithCar: 'other',
    other: 'other',
    dontKnow: 'dontKnow'
};

// not in questionnaire, generated from mode by parser using mapModeToModeCategory:
export const modeCategoryValues = [
    // generated
    'walk',
    'bicycle',
    'transit',
    'schoolBus',
    'carDriver',
    'carPassenger',
    'taxi',
    'other',
    'dontKnow'
] as const;
export type ModeCategory = (typeof modeCategoryValues)[number];

export const driverValues = [
    'householdMember',
    'familyMember',
    'colleague',
    'taxiDriver',
    'transitTaxiDriver',
    'paraTransit',
    'ridesharing',
    'other',
    'dontKnow',
    'nonApplicable'
] as const;
export type Driver = (typeof driverValues)[number];

export const carTypeValues = [
    'householdCar',
    'friendFamilyNonHouseholdCar',
    'rentalCar',
    'companyCar',
    'carsharingStationBased',
    'carsharingFreeFloating',
    'autonomousTaxi',
    'other',
    'dontKnow',
    'nonApplicable'
] as const;
export type CarType = (typeof carTypeValues)[number];
