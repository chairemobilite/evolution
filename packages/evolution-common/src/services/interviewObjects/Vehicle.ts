/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ResponseObject } from './ResponseObject';

/**
 * Type the vehicle object, which is used to represent a vehicle own or rented by a household.
 * It could be any type of vehicle, from a bicycle to a large truck or bus, or even a boat or a plane.
 *
 * @export
 * @interface Vehicle
 */
export type Vehicle<CustomVehicle> = ResponseObject & {
    year?: number;
    make?: string; // TODO: maybe use standardized lists?
    model?: string; // TODO: maybe use standardized lists?
    capacity?: number; // number of passengers, including driver
} & CustomVehicle;
