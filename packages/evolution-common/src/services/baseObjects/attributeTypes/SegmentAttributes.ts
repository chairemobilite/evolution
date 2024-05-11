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
];

export type Mode = (typeof modeValues)[number];

export const mapModeToModeCategory = {
    walk: 'walk',
    bicycle: 'bicycle',
    bicycleElectric: 'bicycle',
    bicycleBikeSharing: 'bicycle',
    bicycleBikeSharingElectric: 'bicycle',
    transitBus: 'transit',
    intercityBus: 'other',
    schoolBus: 'schoolBus',
    integratedSchoolLines: 'transit',
    busOther: 'other',
    transitSubway: 'transit',
    transitREM: 'transit',
    transitRail: 'transit',
    train: 'other',
    intercityRail: 'other',
    personalCar: 'carDriver',
    carDriver: 'carDriver',
    carPassenger: 'carPassenger',
    carDriverCarsharingStationBased: 'carDriver',
    carDriverCarsharingFreeFloating: 'carDriver',
    transitTaxi: 'transit',
    taxi: 'taxi',
    uber: 'taxi',
    paratransit: 'other',
    plane: 'other',
    otherActiveMode: 'other',
    motorcycle: 'other',
    ferry: 'other',
    ferryNoCar: 'other',
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
];
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
];
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
];
export type CarType = (typeof carTypeValues)[number];
