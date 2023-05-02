/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Vehicle } from '../Vehicle';

type CustomVehicle = {
  color?: string;
};

describe('Vehicle type tests', () => {
    test('Basic Vehicle object with custom types', () => {
        const vehicle: Vehicle<CustomVehicle> = {
            _uuid: 'vehicle1',
            year: 2020,
            make: 'Tesla',
            model: 'Model 3',
            capacity: 5,
            color: 'red',
        };

        expect(vehicle.year).toBe(2020);
        expect(vehicle.make).toBe('Tesla');
        expect(vehicle.model).toBe('Model 3');
        expect(vehicle.capacity).toBe(5);
        expect(vehicle.color).toBe('red');
    });
});
