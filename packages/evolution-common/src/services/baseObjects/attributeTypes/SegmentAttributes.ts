/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export const modeValues = [
    'walk',
    'bicycle',
    'bicycleElectric',
    'bicycleBikeSharing',
    'bicycleBikeSharingElectric',
    'transitBus', // category C
    'transitBRT', // category B
    'transitSchoolBus', // for school lines operated by transit agencies
    'transitStreetCar', // category C
    'transitFerry',
    'transitGondola', // category A
    'transitMonorail', // category A
    'transitRRT', // category A
    'transitRegionalRail', // category A
    'intercityBus',
    'intercityTrain',
    'schoolBus',
    'otherBus',
    'carDriver', // type of car (free-floating, station-based, personal car, rental car) separated
    'carPassenger',
    'transitTaxi',
    'taxi',
    'uber',
    'paratransit',
    'plane',
    'otherActiveMode',
    'motorcycle',
    'ferryNoCar',
    'ferryWithCar',
    'other',
    'dontKnow'
] as const;

export type Mode = (typeof modeValues)[number];

export const mapModeToModeCategory : {[mode in Mode]: ModeCategory} = {
    walk: 'walk',
    bicycle: 'bicycle',
    bicycleElectric: 'bicycle',
    bicycleBikeSharing: 'bicycle',
    bicycleBikeSharingElectric: 'bicycle',
    transitBus: 'transit',
    transitBRT: 'transit',
    transitSchoolBus: 'schoolBus', // TODO: decide  if we should use schoolBus or transit here.
    transitStreetCar: 'transit',
    transitFerry: 'transit',
    transitGondola: 'transit',
    transitMonorail: 'transit',
    transitRRT: 'transit',
    transitRegionalRail: 'transit',
    intercityBus: 'transit',
    intercityTrain: 'transit',
    schoolBus: 'schoolBus',
    otherBus: 'other',
    carDriver: 'carDriver',
    carPassenger: 'carPassenger',
    transitTaxi: 'transit',
    taxi: 'taxi',
    uber: 'taxi',
    paratransit: 'other',
    plane: 'other',
    otherActiveMode: 'other',
    motorcycle: 'other',
    ferryNoCar: 'transit',
    ferryWithCar: 'other',
    other: 'other',
    dontKnow: 'dontKnow',
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
