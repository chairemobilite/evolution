/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { interviewAttributesForTestCases, setActiveSurveyObjects } from '../../../../../tests/surveys';
import { tripDiarySectionVisibleConditional } from '../tripDiaryHelpers';

describe('tripDiarySectionVisibleConditional', () => {
        
    let testInterview = _cloneDeep(interviewAttributesForTestCases);
    const iterationContext = ['personId1'];

    beforeEach(() => {
        jest.clearAllMocks();
        testInterview = _cloneDeep(interviewAttributesForTestCases);
        setActiveSurveyObjects(testInterview, { personId: 'personId1', journeyId: 'journeyId1' });
    });

    test('should return false if no iteration context', () => {
        const result = tripDiarySectionVisibleConditional(testInterview, undefined);
        
        expect(result).toBe(false);
    });

    test('should return false if no active journey', () => {
        setActiveSurveyObjects(testInterview, { personId: 'personId1', journeyId: undefined });
        
        const result = tripDiarySectionVisibleConditional(testInterview, iterationContext);
        
        expect(result).toBe(false);
    });

    test('should return true if there is an active journey with trips', () => {
        const result = tripDiarySectionVisibleConditional(testInterview, iterationContext);
        
        expect(result).toBe(true);
    });

    test('should return false if there is an active journey but with no trips', () => {
        const journey = testInterview.response.household!.persons!.personId1.journeys!.journeyId1;
        testInterview.response.household!.persons!.personId1.journeys!.journeyId1 = {
            ...journey,
            personDidTrips: 'no',
            visitedPlaces: undefined,
            trips: undefined
        };

        const result = tripDiarySectionVisibleConditional(testInterview, iterationContext);

        expect(result).toBe(false);
    });
});