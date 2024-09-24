/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as turf from '@turf/turf';
import { pointsToBezierCurve } from '../SurveyGeographyUtils';
import { isFeature, isLineString } from 'geojson-validation';


describe('pointsToBezierCurve', () => {
    describe('pointsToBezierCurve', () => {
        it('should throw an error if less than 2 points are provided', () => {
            expect(() => pointsToBezierCurve([], { superposedSequence: 0, additionalProperties: {} })).toThrow('There must be at least 2 points to convert to a bezier curve');
            expect(() => pointsToBezierCurve([turf.point([0, 0]).geometry], { superposedSequence: 0, additionalProperties: {} })).toThrow('There must be at least 2 points to convert to a bezier curve');
        });

        it('should return a bezier curve feature from a 2 points array', () => {
            const points = [turf.point([0, 0]).geometry, turf.point([1, 1]).geometry];
            const result = pointsToBezierCurve(points, { superposedSequence: 1 });

            expect(result.type).toBe('Feature');
            expect(result.geometry.type).toBe('LineString');
            expect(result.geometry.coordinates.length).toBeGreaterThan(points.length);
        });

        it('should return a bezier curve feature with the correct properties', () => {
            const points = [turf.point([0, 0]).geometry, turf.point([1, 1]).geometry, turf.point([2, 2]).geometry];
            const additionalProperties = { name: 'test' };
            const result = pointsToBezierCurve(points, { superposedSequence: 1, additionalProperties });

            expect(result.type).toBe('Feature');
            expect(result.properties).toEqual(additionalProperties);
            expect(result.geometry.type).toBe('LineString');
            expect(result.geometry.coordinates.length).toBeGreaterThan(points.length);
        });

        it('should create a bezier curve with the correct number of coordinates', () => {
            const points = [turf.point([0, 0]).geometry, turf.point([1, 1]).geometry, turf.point([2, 2]).geometry];
            const result = pointsToBezierCurve(points, { superposedSequence: 1, additionalProperties: {} });

            // Check if the bezier curve has more coordinates than the original points
            expect(result.geometry.coordinates.length).toBeGreaterThan(points.length);
            // Make sure the result is a line string
            expect(isFeature(result)).toEqual(true);
            expect(isLineString(result.geometry)).toEqual(true);
        });

        it('should handle different superposedSequence values correctly', () => {
            const points = [turf.point([0, 0]).geometry, turf.point([1, 1]).geometry, turf.point([2, 2]).geometry];
            const result1 = pointsToBezierCurve(points, { superposedSequence: 0, additionalProperties: {} });
            const result2 = pointsToBezierCurve(points, { superposedSequence: 5, additionalProperties: {} });

            // The coordinates should be different for different superposedSequence values
            expect(result1.geometry.coordinates).not.toEqual(result2.geometry.coordinates);
            // Make sure the results are line string
            expect(isFeature(result1)).toEqual(true);
            expect(isLineString(result1.geometry)).toEqual(true);
            expect(isFeature(result2)).toEqual(true);
            expect(isLineString(result2.geometry)).toEqual(true);
        });
    });
});