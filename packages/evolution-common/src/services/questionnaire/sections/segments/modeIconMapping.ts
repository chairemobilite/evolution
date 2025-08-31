/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Mode } from '../../../baseObjects/attributeTypes/SegmentAttributes';

/**
 * Maps modes to their corresponding icon paths
 * This mapping associates each mode with an appropriate icon in the /dist/icons/modes/ directory
 */
export const modeToIconMapping: Record<Mode, string> = {
    // Walking and mobility assistance
    walk: '/dist/icons/modes/foot/foot.svg',
    wheelchair: '/dist/icons/modes/wheelchair/wheelchair.svg',
    mobilityScooter: '/dist/icons/modes/mobility_scooter/mobility_scooter.svg',

    // Bicycles and small vehicles
    bicycle: '/dist/icons/modes/bicycle/bicycle_with_rider.svg',
    // FIXME Confirm this icon
    bicyclePassenger: '/dist/icons/modes/bicycle/bicycle_with_rider.svg',
    kickScooterElectric: '/dist/icons/modes/scooter/kick_scooter_electric.svg',
    // FIXME Confirm this icon
    otherActiveMode: '/dist/icons/modes/kick_scooter/kick_scooter.svg',
    motorcycle: '/dist/icons/modes/motorcycle/motorcycle.svg',

    // Cars
    carDriver: '/dist/icons/modes/car/car_driver_without_passenger.svg',
    carPassenger: '/dist/icons/modes/car/car_passenger.svg',

    // Transit buses
    transitBus: '/dist/icons/modes/bus/bus_city.svg',
    transitBRT: '/dist/icons/modes/bus/bus_city.svg',
    transitSchoolBus: '/dist/icons/modes/bus/bus_city.svg',
    schoolBus: '/dist/icons/modes/bus/bus_school.svg',
    intercityBus: '/dist/icons/modes/bus/bus_intercity.svg',
    otherBus: '/dist/icons/modes/bus/bus_city.svg',

    // Rail transit
    transitStreetCar: '/dist/icons/modes/tram/tram.svg',
    transitMonorail: '/dist/icons/modes/monorail/monorail.svg',
    transitRRT: '/dist/icons/modes/train/subway.svg',
    // FIXME Confirm this icon
    transitLRT: '/dist/icons/modes/train/train_electric.svg',
    // FIXME Confirm this icon
    transitLRRT: '/dist/icons/modes/train/train_electric.svg',
    transitHSR: '/dist/icons/modes/train/hsr.svg',
    transitRegionalRail: '/dist/icons/modes/train/train.svg',
    intercityTrain: '/dist/icons/modes/train/train.svg',

    // Other transit modes
    transitFerry: '/dist/icons/modes/boat/ferry_without_car.svg',
    transitGondola: '/dist/icons/modes/gondola/gondola_small.svg',
    transitOnDemand: '/dist/icons/modes/minibus/minibus.svg',
    transitTaxi: '/dist/icons/modes/taxi/taxi_driver_with_passenger.svg',

    // Taxis and paratransit
    taxi: '/dist/icons/modes/taxi/taxi_no_steering_wheel.svg',
    paratransit: '/dist/icons/modes/minibus/minibus_with_wheelchair.svg',

    // Other transportation modes
    ferryWithCar: '/dist/icons/modes/boat/ferry_with_car.svg',
    plane: '/dist/icons/modes/airplane/airplane.svg',

    // Other options
    other: '/dist/icons/modes/other/air_balloon.svg',
    dontKnow: '/dist/icons/modes/other/question_mark.svg',
    preferNotToAnswer: '/dist/icons/modes/other/air_balloon.svg'
};

/**
 * Returns the appropriate icon path for a given mode
 * @param mode The transportation mode
 * @returns The path to the icon for the mode
 */
export const getModeIcon = (mode: Mode): string => {
    return modeToIconMapping[mode] || '/dist/icons/modes/other/air_balloon.svg';
};
