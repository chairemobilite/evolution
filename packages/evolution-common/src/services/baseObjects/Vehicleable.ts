/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// We must be able to ask questions about a household vehicles or other list of vehicles (company, person, etc.).

import { BaseVehicle } from './BaseVehicle';

export type Vehicleable = {

    vehicles?: BaseVehicle[];

};
