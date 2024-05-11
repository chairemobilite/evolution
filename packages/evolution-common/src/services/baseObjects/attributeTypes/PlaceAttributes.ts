/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// TODO: move these to chaire-lib

export type GeocodingPrecisionCategory = string; // TODO: add normalized precision levels

export const lastActionValues = [
    'findPlace',
    'mapClicked',
    'markerDragged',
    'preGeocoded'
];
export type LastAction = (typeof lastActionValues)[number];

export const transitPlaceTypeValues = [
    'multimodalStation',
    'trainStation',
    'busStop',
    'busStation',
    'tramStation',
    'tramStop',
    'subwayStation',
    'otherStation',
    'airport',
    'ferryTerminal',
    'other',
    'dontKnow',
    'nonApplicable'
];
export type TransitPlaceType = (typeof transitPlaceTypeValues)[number];

export const parkingTypeValues = [
    'interior',
    'exterior',
    'streetside',
    'other',
    'dontKnow',
    'nonApplicable'
];
export type ParkingType = (typeof parkingTypeValues)[number];

export const residentialParkingTypeValues = [
    'drivewayWithoutGarage',
    'drivewayWithGarage',
    'interior',
    'exterior',
    'streetside',
    'residentialPermit',
    'other',
    'dontKnow',
    'nonApplicable'
];
export type ResidentialParkingType = (typeof parkingTypeValues)[number];

export const parkingFeeTypeValues = [
    'free',
    'freePermit',
    'paidByHour',
    'paidByDay',
    'paidByWeek',
    'paidByMonth',
    'paidByYear',
    'parkingMeter',
    'dontKnow',
    'nonApplicable'
];
export type ParkingFeeType = (typeof parkingFeeTypeValues)[number];

export const workParkingFeeTypeValues = [
    'free',
    'paidByEmployer',
    'paidByEmployee',
    'parkingMeter',
    'dontKnow',
    'nonApplicable'
];
export type WorkParkingFeeType = (typeof workParkingFeeTypeValues)[number];

export const schoolParkingFeeTypeValues = [
    'free',
    'paidBySchool',
    'paidByStudent',
    'parkingMeter',
    'dontKnow',
    'nonApplicable'
];
export type SchoolParkingFeeType = (typeof schoolParkingFeeTypeValues)[number];

