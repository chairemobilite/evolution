/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ObjectReadableMock } from 'stream-mock';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import _cloneDeep from 'lodash/cloneDeep';

jest.useFakeTimers();

jest.mock('evolution-backend/lib/models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn().mockImplementation(() => new ObjectReadableMock([]))
}));

const baseInterview: UserInterviewAttributes = {
    responses: {
        household: {
            size: 1,
            tripsDate: '2022-09-26',
            persons: {
                a12345: {
                    age: 56,
                    gender: 'female',
                    occupation: 'fullTimeStudent',
                    visitedPlaces: {
                        p1: {
                            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.1, 45.1] }, properties: { lastAction: 'shortcut' }},
                            activity: 'service',
                            arrivalTime: 42900,
                            departureTime: 45000,
                            nextPlaceCategory: 'visitedAnotherPlace'
                        } as any,
                        p2: {
                            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.3, 45.0] }, properties: { lastAction: 'shortcut' }},
                            activity: 'service',
                            arrivalTime: 46800,
                            departureTime: 54000,
                            nextPlaceCategory: 'visitedAnotherPlace'
                        } as any
                    },
                    trips: {
                        t1: {
                            _originVisitedPlaceUuid: 'p1',
                            _destinationVisitedPlaceUuid: 'p2',
                            segments: {
                                s1: {
                                    _sequence: 1,
                                    mode: 'transitBus'
                                }
                            }
                        }
                    }
                } as any
            }
        } as any,
        previousDay: '2022-09-12',
        previousBusinessDay: '2022-09-12',
        _activePersonId: 'a12345'
    },
    id: 1,
    uuid: 'arbitrary',
    participant_id: 1,
    is_completed: false,
    validations: {},
    is_valid: true,
};
