/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getBirdDistanceMeters, getBirdSpeedKph } from '../PhysicsUtils';
import * as PhysicsUtils from '../PhysicsUtils';

describe('getBirdDistanceMeters', () => {

    const origin = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [45.5, -75.5]
        },
        properties: {}
    } as GeoJSON.Feature<GeoJSON.Point>;

    const destination = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [45.4, -75.6]
        },
        properties: {}
    } as GeoJSON.Feature<GeoJSON.Point>;

    const invalidPoint1 = {
        type: 'Feature',
        geometry: undefined,
        properties: {}
    } as any;

    const invalidPoint2 = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [45.4, -75.6]
        }
    } as any;

    const invalidPoint3 = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: []
        },
        properties: {}
    } as any;

    const invalidPoint4 = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: undefined
        },
        properties: {}
    } as any;

    const polygon = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[45.5, -75.5], [45.4, -75.6], [45.4, -75.4], [45.5, -75.5]]]
        },
        properties: {}
    } as GeoJSON.Feature<GeoJSON.Polygon>;

    it('getBirdDistanceMeters when origin and destination are valid', () => {
        const speed = getBirdDistanceMeters(origin, destination);
        expect(speed).toBe(11461);
    });

    it('getBirdDistanceMeters when origin or destination is invalid', () => {
        let speed = getBirdDistanceMeters(invalidPoint1, destination);
        expect(speed).toBeUndefined();
        speed = getBirdDistanceMeters(invalidPoint2, destination);
        expect(speed).toBeUndefined();
        speed = getBirdDistanceMeters(invalidPoint3, destination);
        expect(speed).toBeUndefined();
        speed = getBirdDistanceMeters(invalidPoint4, destination);
        expect(speed).toBeUndefined();
        speed = getBirdDistanceMeters(invalidPoint4, polygon as any);
        expect(speed).toBeUndefined();
    });

    it('getBirdDistanceMeters when origin and destination are invalid', () => {
        const speed = getBirdDistanceMeters(invalidPoint1, invalidPoint2);
        expect(speed).toBeUndefined();
    });

    it('getBirdSpeedKph when getBirdDistanceMeters returns a negative value', () => {
        jest.spyOn(PhysicsUtils, 'getBirdDistanceMeters').mockReturnValue(-100);

        const speed = getBirdSpeedKph(origin, destination, 3600);
        expect(speed).toBeUndefined();

        jest.restoreAllMocks();
    });
});

describe('getBirdSpeedKph', () => {
    const origin = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [45.5, -75.5]
        },
        properties: {}
    } as GeoJSON.Feature<GeoJSON.Point>;

    const destination = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [45.4, -75.6]
        },
        properties: {}
    } as GeoJSON.Feature<GeoJSON.Point>;

    const invalidPoint1 = {
        type: 'Feature',
        geometry: undefined,
        properties: {}
    } as any;

    const invalidPoint2 = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [45.4, -75.6]
        }
    } as any;

    const invalidPoint3 = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: []
        },
        properties: {}
    } as any;

    const invalidPoint4 = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: undefined
        },
        properties: {}
    } as any;

    const polygon = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[45.5, -75.5], [45.4, -75.6], [45.4, -75.4], [45.5, -75.5]]]
        },
        properties: {}
    } as GeoJSON.Feature<GeoJSON.Polygon>;

    it('getBirdSpeedKph when origin and destination are valid', () => {
        const speed = getBirdSpeedKph(origin, destination, 3600);
        expect(speed).toBe(11.461);
    });

    it('getBirdSpeedKph when origin or destination is invalid', () => {
        let speed = getBirdSpeedKph(invalidPoint1, destination, 3600);
        expect(speed).toBeUndefined();
        speed = getBirdSpeedKph(invalidPoint2, destination, 3600);
        expect(speed).toBeUndefined();
        speed = getBirdSpeedKph(invalidPoint3, destination, 3600);
        expect(speed).toBeUndefined();
        speed = getBirdSpeedKph(invalidPoint4, destination, 3600);
        expect(speed).toBeUndefined();
        speed = getBirdSpeedKph(invalidPoint4, polygon as any, 3600);
        expect(speed).toBeUndefined();
    });

    it('getBirdSpeedKph when duration is invalid', () => {
        let speed = getBirdSpeedKph(origin, destination, -1);
        expect(speed).toBeUndefined();
        speed = getBirdSpeedKph(origin, destination, 0);
        expect(speed).toBeUndefined();
        speed = getBirdSpeedKph(origin, destination, undefined);
        expect(speed).toBeUndefined();
    });
});

