/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Household } from '../Household';
import { Place } from '../Place';
import { Person } from '../Person';
import { Vehicle } from '../Vehicle';
import { Metadata } from '../../interviews/Metadata';

type CustomHousehold = {
    incomeLevel: string;
};

type CustomPerson = {
    occupation?: string;
};

type CustomVehicle = {
    color?: string;
};

const homeGeography: GeoJSON.Feature<GeoJSON.Point> = {
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [-73.6, 45.5]
    },
    properties: {
        foo: 'bar'
    }
};
const home: Place<unknown> = {
    _uuid: 'place-1',
    geography: homeGeography,
    name: 'Place so cool!',
    address: '111, Location Place'
};

describe('Household type tests', () => {
    test('Basic Household object with custom types', () => {
        const household: Household<CustomHousehold, CustomPerson, unknown, CustomVehicle, unknown, unknown, unknown> = {
            _uuid: 'household-1',
            _metadata: {
                foo: 'bar'
            } as Metadata,
            size: 3,
            carNumber: 2,
            incomeLevel: 'medium',
            persons: {
                person1: {
                    _uuid: 'person1',
                    age: 30,
                    gender: 'male',
                    occupation: 'engineer',
                } as Person<CustomPerson, unknown, unknown, unknown, unknown>,
            },
            carVehicles: {
                vehicle1: {
                    _uuid: 'vehicle1',
                    year: 2015,
                    make: 'Toyota',
                    model: 'Camry',
                    color: 'blue',
                } as Vehicle<CustomVehicle>,
            },
            home
        };

        expect(household.size).toBe(3);
        expect(household.persons.person1.age).toBe(30);
        expect(household.persons.person1.gender).toBe('male');
        expect(household.persons.person1.occupation).toBe('engineer');
        expect(household.carVehicles?.vehicle1.year).toBe(2015);
        expect(household.carVehicles?.vehicle1.make).toBe('Toyota');
        expect(household.carVehicles?.vehicle1.color).toBe('blue');
        expect(household.home?.name).toBe('Place so cool!');
        expect(household._metadata?.foo).toBe('bar');
    });
});
