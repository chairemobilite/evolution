/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ResponseObject } from './ResponseObject';
import { Person } from './Person';
import { Vehicle } from './Vehicle';
import { Place } from './Place';

/**
 * Type the household response object, which is recurring in all travel surveys and alike.
 *
 * @export
 * @interface Household
 */
export type Household<
    CustomHousehold,
    CustomPerson,
    CustomPlace,
    CustomVehicle,
    CustomVisitedPlace,
    CustomTrip,
    CustomSegment
> = ResponseObject & {
    // TODO Are there any fields that will be common to ALL households?
    size: number;
    carNumber?: number; // number of car vehicles possessed or rented by any member of the household (including small trucks, pick-ups, minivans, vans, etc.)
    twoWheelNumber?: number; // number of two wheel vehicle possessed or rented by any member of the household
    home?: Place<CustomPlace>;
    persons: {
        [personId: string]: Person<CustomPerson, CustomPlace, CustomVisitedPlace, CustomTrip, CustomSegment>;
    };
    carVehicles?: {
        [vehicleId: string]: Vehicle<CustomVehicle>;
    };
    twoWheelVehicles?: {
        [vehicleId: string]: Vehicle<CustomVehicle>;
    };
    bicycleVehicles?: {
        [vehicleId: string]: Vehicle<CustomVehicle>;
    };
} & CustomHousehold;
