/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {
    lineString as turfLineString,
    bearing as turfBearing,
    destination as turfDestination,
    distance as turfDistance,
    midpoint as turfMidpoint,
    bezierSpline as turfBezierSpline
} from '@turf/turf';

/**
 * Convert an array of points to a bezier curved line string
 *
 * @param points The array of points to convert to a bezier curve. There must be at least 2 points, otherwise an exception will be thrown
 * @param options The options to use when converting the line to a bezier curve
 * @param { number } options.superposedSequence The superposed sequence to use when converting the line to a bezier curve. The higher this number, the wider will be the curve
 * @param { object } options.additionalProperties The additional properties to add to the bezier curve feature
 * @returns
 */
export const pointsToBezierCurve = (
    points: GeoJSON.Point[],
    {
        superposedSequence = 0,
        additionalProperties = {}
    }: { superposedSequence?: number; additionalProperties?: { [key: string]: any } }
): GeoJSON.Feature<GeoJSON.LineString> => {
    if (points.length < 2) {
        throw new Error('There must be at least 2 points to convert to a bezier curve');
    }
    const tripCurveCoordinates: number[][] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const originGeojson = points[i];
        const destinationGeojson = points[i + 1];

        const midpoint = turfMidpoint(originGeojson.coordinates, destinationGeojson.coordinates);
        const distance = turfDistance(originGeojson.coordinates, destinationGeojson.coordinates, { units: 'meters' });
        const bearing = turfBearing(originGeojson.coordinates, destinationGeojson.coordinates);
        const bezierBearing = bearing + 90;
        const offsetMidPoint = turfDestination(
            midpoint,
            ((0.1 + superposedSequence * 0.025) * distance) / 1000,
            bezierBearing
        );
        const bezierLine = turfLineString([
            originGeojson.coordinates,
            offsetMidPoint.geometry.coordinates,
            destinationGeojson.coordinates
        ]);
        const bezierCurve = turfBezierSpline(bezierLine, { resolution: 10000, sharpness: 1.5 });
        tripCurveCoordinates.push(...bezierCurve.geometry.coordinates);
    }
    return {
        type: 'Feature',
        properties: additionalProperties,
        geometry: {
            type: 'LineString',
            coordinates: tripCurveCoordinates
        }
    };
};
