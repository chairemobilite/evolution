/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { getTripSegmentsIntro } from '../widgetTripSegmentsIntro';
import { interviewAttributesForTestCases, setActiveSurveyObjects } from '../../../../../tests/surveys';

beforeEach(() => {
    jest.clearAllMocks();
})

describe('getTripSegmentsIntro', () => {
    it('should return the correct widget config', () => {

        const options = {
            context: jest.fn()
        };

        const widgetConfig = getTripSegmentsIntro(options);

        expect(widgetConfig).toEqual({
            type: 'text',
            text: expect.any(Function)
        });
    });
});

describe('tripSegmentsIntro text', () => {

    const options = {
        context: jest.fn()
    };

    const widgetText = getTripSegmentsIntro(options).text as any;
    const mockedT = jest.fn().mockReturnValue('translatedString');
    const p2t2segmentsPath = 'household.persons.personId2.journeys.journeyId2.trips.tripId2P2.segments';
   
    test('should throw an error if no person/journey/trip context', () => {
        // Use a path that does not resolve to anything
        const invalidPath = 'invalid.path';
        expect(() => widgetText(mockedT, interviewAttributesForTestCases, invalidPath)).toThrow('trip segments intro: trip, journey or person not found');
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return empty if no origin', () => {
        // Set the origin to an unexisting place
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId2', journeyId: 'journeyId2', activeTripId: 'tripId2P2' });
        testInterview.response.household!.persons!.personId2.journeys!.journeyId2.trips!.tripId2P2._originVisitedPlaceUuid = 'unexisting';

        expect(widgetText(mockedT, testInterview, p2t2segmentsPath)).toEqual('');
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return empty if no destination', () => {
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId2', journeyId: 'journeyId2', activeTripId: 'tripId2P2' });
        testInterview.response.household!.persons!.personId2.journeys!.journeyId2.trips!.tripId2P2._destinationVisitedPlaceUuid = 'unexisting';

        expect(widgetText(mockedT, testInterview, p2t2segmentsPath)).toEqual('');
        expect(mockedT).not.toHaveBeenCalled();
    });

    test('should return correct string with normal activities', () => {
        // Set the origin to an unexisting place
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId2', journeyId: 'journeyId2', activeTripId: 'tripId2P2' });
        
        expect(widgetText(mockedT, testInterview)).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: 'other',
            count: 3,
            destinationName: testInterview.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!.otherWorkPlace1P2.name,
            // leads to shortcut
            originName: testInterview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.name
        });
        expect(options.context).toHaveBeenCalledWith('other');
    });

    test('should return correct string with loop activity at origin', () => {
        // Set the origin place's activity to a loop activity, taking the first trip instead of second, as it is not a shortcut
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId2', journeyId: 'journeyId2', activeTripId: 'tripId1P2' });
        testInterview.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!.homePlace1P2.activity = 'leisureStroll';
        expect(widgetText(mockedT, testInterview)).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: 'leisureStroll',
            count: 3,
            originName: 'translatedString', // origin has no name
            // leads to shortcut
            destinationName: testInterview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.name
        });
        expect(mockedT).toHaveBeenCalledWith('survey:placeWithSequenceGeneric', { sequence: 1 });
        expect(options.context).toHaveBeenCalledWith('leisureStroll');
    });

    test('should return correct string with normal activities and no context function', () => {
        // No context sent as options
        const widgetText = getTripSegmentsIntro().text as any;
        const testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId2', journeyId: 'journeyId2', activeTripId: 'tripId2P2' });
        
        expect(widgetText(mockedT, testInterview)).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:CurrentTripSegmentsIntro', 'segments:CurrentTripSegmentsIntro'], {
            context: 'other',
            count: 3,
            destinationName: testInterview.response.household!.persons!.personId2.journeys!.journeyId2.visitedPlaces!.otherWorkPlace1P2.name,
            // leads to shortcut
            originName: testInterview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.name
        });
    });

});
