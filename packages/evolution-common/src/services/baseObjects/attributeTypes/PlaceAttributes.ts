/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// TODO: move these to chaire-lib

export type GeocodingPrecisionCategory = string; // TODO: add normalized precision levels

export const lastActionValues = ['findPlace', 'mapClicked', 'markerDragged', 'preGeocoded'] as const;
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
] as const;
export type TransitPlaceType = (typeof transitPlaceTypeValues)[number];

export const parkingTypeValues = ['interior', 'exterior', 'streetside', 'other', 'dontKnow', 'nonApplicable'] as const;
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
] as const;
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
] as const;
export type ParkingFeeType = (typeof parkingFeeTypeValues)[number];

export const workParkingFeeTypeValues = [
    'free',
    'paidByEmployer',
    'paidByEmployee',
    'parkingMeter',
    'dontKnow',
    'nonApplicable'
] as const;
export type WorkParkingFeeType = (typeof workParkingFeeTypeValues)[number];

export const schoolParkingFeeTypeValues = [
    'free',
    'paidBySchool',
    'paidByStudent',
    'parkingMeter',
    'dontKnow',
    'nonApplicable'
] as const;
export type SchoolParkingFeeType = (typeof schoolParkingFeeTypeValues)[number];
