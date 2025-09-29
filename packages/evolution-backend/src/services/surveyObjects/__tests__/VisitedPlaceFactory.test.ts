/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { populateVisitedPlacesForJourney } from '../VisitedPlaceFactory';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { Journey, ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { createOk, createErrors } from 'evolution-common/lib/types/Result.type';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

// Mock VisitedPlace.create
jest.mock('evolution-common/lib/services/baseObjects/VisitedPlace', () => ({
    VisitedPlace: {
        create: jest.fn()
    }
}));
const MockedVisitedPlace = VisitedPlace as jest.MockedClass<typeof VisitedPlace>;

describe('VisitedPlaceFactory', () => {
    let surveyObjectsRegistry: SurveyObjectsRegistry;
    let surveyObjectsWithErrors: SurveyObjectsWithErrors;
    let journey: Journey;
    let journeyAttributes: ExtendedJourneyAttributes;
    let home: Home;
    let person: Person;

    beforeEach(() => {
        surveyObjectsRegistry = new SurveyObjectsRegistry();

        surveyObjectsWithErrors = {
            interview: undefined,
            household: undefined,
            home: undefined,
            errorsByObject: {
                interview: [],
                interviewUuid: '123',
                homeUuid: '123',
                householdUuid: '123',
                home: [],
                household: [],
                personsByUuid: {},
                journeysByUuid: {},
                visitedPlacesByUuid: {},
                tripsByUuid: {},
                segmentsByUuid: {}
            }
        };

        journey = {
            _uuid: 'journey-uuid',
            addVisitedPlace: jest.fn()
        } as unknown as Journey;

        person = {
            _uuid: 'person-uuid',
            addVisitedPlace: jest.fn()
        } as unknown as Person;

        journeyAttributes = {
            _uuid: 'journey-uuid',
            visitedPlaces: {
                'vp-1': {
                    _uuid: 'vp-1',
                    _sequence: 1,
                    activity: 'work',
                    name: 'Office'
                },
                'vp-2': {
                    _uuid: 'vp-2',
                    _sequence: 2,
                    activity: 'home',
                    name: 'Home'
                }
            }
        } as unknown as ExtendedJourneyAttributes;

        home = {
            _uuid: 'home-uuid',
            geography: { type: 'Point', coordinates: [-73.5, 45.5] }
        } as unknown as Home;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('populateVisitedPlacesForJourney', () => {
        it('should create visited places successfully and add them to journey', async () => {
            const mockVisitedPlace1 = {
                _uuid: 'vp-1',
                activity: 'work',
                place: { geography: { type: 'Point', coordinates: [-73.6, 45.6] } }
            } as unknown as VisitedPlace;

            const mockVisitedPlace2 = {
                _uuid: 'vp-2',
                activity: 'home',
                place: { geography: null }
            } as unknown as VisitedPlace;

            (MockedVisitedPlace.create as jest.Mock).mockReturnValueOnce(createOk(mockVisitedPlace1))
                .mockReturnValueOnce(createOk(mockVisitedPlace2));

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify VisitedPlace.create was called with correct attributes
            expect(MockedVisitedPlace.create).toHaveBeenCalledTimes(2);
            expect(MockedVisitedPlace.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'vp-1',
                    _sequence: 1,
                    activity: 'work',
                    name: 'Office'
                }),
                surveyObjectsRegistry
            );
            expect(MockedVisitedPlace.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    _uuid: 'vp-2',
                    _sequence: 2,
                    activity: 'home',
                    name: 'Home'
                }),
                surveyObjectsRegistry
            );

            // Verify visited places were added to journey
            expect(journey.addVisitedPlace).toHaveBeenCalledTimes(2);
            expect(journey.addVisitedPlace).toHaveBeenCalledWith(mockVisitedPlace1);
            expect(journey.addVisitedPlace).toHaveBeenCalledWith(mockVisitedPlace2);

            // Verify no errors
            expect(surveyObjectsWithErrors.errorsByObject.visitedPlacesByUuid).toEqual({});
        });

        it('should assign home geography to home activity visited places', async () => {
            const mockVisitedPlace = {
                _uuid: 'vp-home',
                activity: 'home',
                place: null // No place initially
            } as unknown as VisitedPlace;

            (MockedVisitedPlace.create as jest.Mock).mockReturnValue(createOk(mockVisitedPlace));

            journeyAttributes.visitedPlaces = {
                'vp-home': {
                    _sequence: 1,
                    _uuid: 'vp-home',
                    activity: 'home'
                }
            } as any;

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify home was assigned as the place
            expect(mockVisitedPlace.place).toBe(home);
        });

        it('should not assign home geography to non-home activities', async () => {
            const mockVisitedPlace = {
                _uuid: 'vp-work',
                activity: 'work',
                place: { geography: { type: 'Point', coordinates: [-73.6, 45.6] } }
            } as unknown as VisitedPlace;

            const originalGeography = mockVisitedPlace.place!.geography;
            (MockedVisitedPlace.create as jest.Mock).mockReturnValue(createOk(mockVisitedPlace));

            journeyAttributes.visitedPlaces = {
                'vp-work': {
                    _sequence: 1,
                    _uuid: 'vp-work',
                    activity: 'work'
                }
            } as any;

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify geography was not changed
            expect(mockVisitedPlace.place!.geography).toBe(originalGeography);
        });

        it('should handle visited place creation errors', async () => {
            const errors = [new Error('Invalid visited place data')];

            (MockedVisitedPlace.create as jest.Mock).mockReturnValueOnce(createErrors(errors))
                .mockReturnValueOnce(createOk({
                    _uuid: 'vp-2'
                } as VisitedPlace));

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify error was stored
            expect(surveyObjectsWithErrors.errorsByObject.visitedPlacesByUuid['vp-1']).toEqual(errors);

            // Verify only successful visited place was added to journey
            expect(journey.addVisitedPlace).toHaveBeenCalledTimes(1);
        });

        it('should skip visited places with undefined uuid', async () => {
            journeyAttributes.visitedPlaces = {
                'undefined': {
                    _uuid: 'undefined',
                    activity: 'work'
                },
                'vp-1': {
                    _uuid: 'vp-1',
                    activity: 'home'
                }
            } as any;

            (MockedVisitedPlace.create as jest.Mock).mockReturnValue(createOk({
                _uuid: 'vp-1'
            } as VisitedPlace));

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Should only create one visited place (skip undefined)
            expect(MockedVisitedPlace.create).toHaveBeenCalledTimes(1);
            expect(journey.addVisitedPlace).toHaveBeenCalledTimes(1);
        });

        it('should handle missing visitedPlaces attributes', async () => {
            journeyAttributes.visitedPlaces = undefined;

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            expect(MockedVisitedPlace.create).not.toHaveBeenCalled();
            expect(journey.addVisitedPlace).not.toHaveBeenCalled();
        });

        it('should sort visited places by sequence', async () => {
            // Create visited places with mixed sequence order
            journeyAttributes.visitedPlaces = {
                'vp-3': {
                    _uuid: 'vp-3',
                    _sequence: 3,
                    activity: 'shopping'
                },
                'vp-1': {
                    _uuid: 'vp-1',
                    _sequence: 1,
                    activity: 'home'
                },
                'vp-2': {
                    _uuid: 'vp-2',
                    _sequence: 2,
                    activity: 'work'
                }
            } as any;

            (MockedVisitedPlace.create as jest.Mock).mockReturnValueOnce(createOk({ _uuid: 'vp-1' } as VisitedPlace))
                .mockReturnValueOnce(createOk({ _uuid: 'vp-2' } as VisitedPlace))
                .mockReturnValueOnce(createOk({ _uuid: 'vp-3' } as VisitedPlace));

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors, person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Verify visited places were created in sequence order (1, 2, 3)
            expect(MockedVisitedPlace.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ _sequence: 1 }), surveyObjectsRegistry);
            expect(MockedVisitedPlace.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ _sequence: 2 }), surveyObjectsRegistry);
            expect(MockedVisitedPlace.create).toHaveBeenNthCalledWith(3, expect.objectContaining({ _sequence: 3 }), surveyObjectsRegistry);
        });

        it('should handle visited place without place property', async () => {
            const mockVisitedPlace = {
                _uuid: 'vp-home',
                activity: 'home',
                place: null
            } as unknown as VisitedPlace;

            (MockedVisitedPlace.create as jest.Mock).mockReturnValue(createOk(mockVisitedPlace));

            journeyAttributes.visitedPlaces = {
                'vp-home': {
                    _uuid: 'vp-home',
                    activity: 'home'
                }
            } as any;

            await populateVisitedPlacesForJourney(surveyObjectsWithErrors,  person, journey, journeyAttributes, home, { uuid: 'test' } as any, surveyObjectsRegistry);

            // Should not throw error and should still add to journey
            expect(journey.addVisitedPlace).toHaveBeenCalledWith(mockVisitedPlace);
        });
    });
});
