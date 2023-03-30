/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { InterviewResponses, SectionActionStatus } from '../interview';
import { Household } from '../../interviewObjects/Household';
import { Place } from '../../interviewObjects/Place';
import { Vehicle } from '../../interviewObjects/Vehicle';
import { Person } from '../../interviewObjects/Person';

type CustomSurvey = { customSurveyAttribute: string };
type CustomHousehold = { customHouseholdAttribute: string };
type CustomPerson = { customPersonAttribute: string };
type CustomPlace = { customPlaceAttribute: string };
type CustomVehicle = { customVehicleAttribute: string };
type CustomVisitedPlace = { customVisitedPlaceAttribute: string };
type CustomTrip = { customTripAttribute: string };
type CustomSegment = { customSegmentAttribute: string };

describe('InterviewResponses type tests', () => {
    test('Valid InterviewResponses values', () => {
        const interviewResponses: InterviewResponses<CustomSurvey, CustomHousehold, CustomPerson, CustomPlace, CustomVehicle, CustomVisitedPlace, CustomTrip, CustomSegment> = {
            customSurveyAttribute: 'Some custom survey attribute value',
            _metadata: {
                foo: 'bar'
            },
            _activePersonId: '12345',
            _activeSection: 'home',
            _browser: {
                userAgent: 'Mozilla/5.0'
            },
            _ip: '192.168.0.1',
            _startedAt: 1623146354,
            _updatedAt: 1623147354,
            _language: 'en',
            _isCompleted: true,
            _editingUsers: [2, 3],
            _sections: {
                section1: {
                    _isStarted: true,
                    _isCompleted: true,
                    _startedAt: 1623146354,
                    _completedAt: 1623147354,
                    nestedSection1: {
                        _isStarted: true,
                        _isCompleted: true,
                        _startedAt: 1623146354,
                        _completedAt: 1623147354,
                    }
                } as any, // TODO: fix this. It does not accept SectionStatus (unested or nested), but it should. Seems to be a problem with overlapping types
                _actions: [{
                    section: 'section1',
                    action: 'start',
                    ts: 1623146355,
                } as SectionActionStatus]
            } as any, // TODO: fix this. It does not accept SectionStatus (unested or nested), but it should. Seems to be a problem with overlapping types
            home: {
                _uuid: 'place-uuid',
                customPlaceAttribute: 'Some custom place attribute value',
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.974982, 40.764936]
                    },
                    properties: {}
                }
            } as Place<CustomPlace>,
            household: {
                _uuid: 'household-uuid',
                size: 4,
                carNumber: 1,
                twoWheelNumber: 2,
                customHouseholdAttribute: 'Some custom household attribute value',
                persons: {
                    person1: {
                        _uuid: 'person-uuid',
                        customPersonAttribute: 'Some custom person attribute value',
                        age: 43
                    } as Person<CustomPerson, CustomPlace, CustomVisitedPlace, CustomTrip, CustomSegment>
                },
                home: {
                    _uuid: 'place-uuid',
                    customPlaceAttribute: 'Some custom place attribute value',
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-73.974982, 40.764936]
                        },
                        properties: {}
                    }
                } as Place<CustomPlace>,
                carVehicles: {
                    vehicle1: {
                        _uuid: 'vehicle-uuid',
                        customVehicleAttribute: 'Some custom vehicle attribute value',
                        year: 2010,
                        make: 'Toyota',
                        model: 'Camry'
                    } as Vehicle<CustomVehicle>
                }
            } as Household<CustomHousehold, CustomPerson, CustomPlace, CustomVehicle, CustomVisitedPlace, CustomTrip, CustomSegment>
        };

        expect(interviewResponses).toBeDefined();
        expect(interviewResponses._activePersonId).toEqual('12345');
        expect(interviewResponses._activeSection).toEqual('home');
        expect(interviewResponses._startedAt).toEqual(1623146354);
        expect(interviewResponses._updatedAt).toEqual(1623147354);
        expect(interviewResponses._language).toEqual('en');
        expect(interviewResponses._isCompleted).toEqual(true);
        expect(interviewResponses.household).toBeDefined();
        expect(interviewResponses.home).toBeDefined();
        expect(interviewResponses.household?.persons.person1.age).toBe(43);
        expect(interviewResponses.household?.home?.geography?.geometry.coordinates).toEqual([-73.974982, 40.764936]);
        expect(interviewResponses.household?.carVehicles?.vehicle1.year).toBe(2010);
    });
});
