/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { SurveyMapTripProperties } from '../../../components/admin/validations/InterviewMap';
import { prepareTripsForMapLayers } from '../interviewMapTrips';

const tripColor = '#ff0000';
const personColor = '#00ff00';
const defaultColor = '#000000';

const createTrip = (
    properties: SurveyMapTripProperties
): GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties> => ({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [
            [-73.6, 45.5],
            [-73.5, 45.6]
        ]
    },
    properties
});

describe('prepareTripsForMapLayers', () => {
    test.each([
        {
            description: 'the trip color when the trip and its person have a color',
            properties: { color: tripColor, personColor },
            expectedColor: tripColor
        },
        {
            description: 'the trip color when the person has no color',
            properties: { color: tripColor },
            expectedColor: tripColor
        },
        {
            description: 'the person color when the trip has no color',
            properties: { personColor },
            expectedColor: personColor
        },
        {
            description: 'the person color when the trip color is empty',
            properties: { color: '', personColor },
            expectedColor: personColor
        },
        {
            description: 'black when the trip and its person have no color',
            properties: {},
            expectedColor: defaultColor
        },
        {
            description: 'black when the trip and person colors are empty',
            properties: { color: '', personColor: '' },
            expectedColor: defaultColor
        }
    ])('sets the color to $description', ({ properties, expectedColor }) => {
        const trip = createTrip({ ...properties, tripUuid: 'trip1' });

        expect(prepareTripsForMapLayers([trip])).toEqual({
            activeTrips: [],
            inactiveTrips: [createTrip({ ...properties, tripUuid: 'trip1', color: expectedColor })]
        });
    });

    test.each([
        { description: 'an active trip', active: true, expectedGroup: 'activeTrips' as const },
        { description: 'a trip that is not active', active: false, expectedGroup: 'inactiveTrips' as const },
        { description: 'a trip without active state', active: undefined, expectedGroup: 'inactiveTrips' as const }
    ])('returns $description in $expectedGroup', ({ active, expectedGroup }) => {
        const trip = createTrip({ active, tripUuid: 'trip1', color: tripColor });

        expect(prepareTripsForMapLayers([trip])).toEqual({
            activeTrips: [],
            inactiveTrips: [],
            [expectedGroup]: [trip]
        });
    });

    test('separates the active trips from the other trips, keeping their order', () => {
        const trips = [
            createTrip({ active: false, tripUuid: 'trip1', personColor }),
            createTrip({ active: true, tripUuid: 'trip2', personColor }),
            createTrip({ active: false, tripUuid: 'trip3', color: tripColor, personColor })
        ];

        expect(prepareTripsForMapLayers(trips)).toEqual({
            activeTrips: [createTrip({ active: true, tripUuid: 'trip2', personColor, color: personColor })],
            inactiveTrips: [
                createTrip({ active: false, tripUuid: 'trip1', personColor, color: personColor }),
                createTrip({ active: false, tripUuid: 'trip3', color: tripColor, personColor })
            ]
        });
    });

    test('returns no trips when there are none', () => {
        expect(prepareTripsForMapLayers([])).toEqual({ activeTrips: [], inactiveTrips: [] });
    });

    test('does not change the trips received', () => {
        const trip = createTrip({ tripUuid: 'trip1', personColor });

        prepareTripsForMapLayers([trip]);

        expect(trip).toEqual(createTrip({ tripUuid: 'trip1', personColor }));
    });
});
