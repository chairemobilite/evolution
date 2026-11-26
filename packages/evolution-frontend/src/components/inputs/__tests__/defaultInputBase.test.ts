/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { inputMapFindPlaceBase } from '../defaultInputBase';

// The real helper loads the frontend config, which webpack defines at build time
jest.mock('../../../services/display/frontendHelper', () => ({
    validateButtonActionWithCompleteSection: jest.fn()
}));

const mockTranslation = jest.fn().mockImplementation((key: string) => key);
const path = 'household.home.geography';

const interviewWithGeography = (geography: unknown) =>
    ({ response: { household: { home: { geography } } } }) as any;

const translateFailedMessages = (value: unknown, geography: unknown): string[] =>
    (inputMapFindPlaceBase.validations as any)(value, undefined, interviewWithGeography(geography), path)
        .filter(({ validation }) => validation)
        .map(({ errorMessage }) => {
            expect(typeof errorMessage).toEqual('function');
            return errorMessage(mockTranslation);
        });

describe('inputMapFindPlaceBase validations', () => {
    const preciseGeography = { type: 'Feature', properties: { lastAction: 'mapClicked', zoom: 15 } };
    const impreciseGeography = { type: 'Feature', properties: { lastAction: 'mapClicked', zoom: 14 } };

    test('should require a position', () => {
        expect(translateFailedMessages(undefined, undefined)).toEqual(['visitedPlaces:locationIsRequiredError']);
    });

    test('should reject a position clicked on the map at a low zoom', () => {
        expect(translateFailedMessages(impreciseGeography, impreciseGeography)).toEqual([
            'visitedPlaces:locationIsNotPreciseError'
        ]);
    });

    test('should accept a precise position', () => {
        expect(translateFailedMessages(preciseGeography, preciseGeography)).toEqual([]);
    });
});
