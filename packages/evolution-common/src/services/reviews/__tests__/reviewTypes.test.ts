/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { surveyObjectNames } from '../../baseObjects/types';
import { reviewUuidKeyedCollectionKeysByObjectType } from '../types';

const singletonSurveyObjectNames = new Set(['interview', 'household', 'home']);

describe('review review bucket types', () => {
    test('reviewUuidKeyedCollectionKeysByObjectType covers every non-singleton survey object name', () => {
        const uuidKeyedSurveyObjectNames = surveyObjectNames.filter((name) => !singletonSurveyObjectNames.has(name));
        expect(Object.keys(reviewUuidKeyedCollectionKeysByObjectType).sort()).toEqual(
            [...uuidKeyedSurveyObjectNames].sort()
        );
    });

    test('reviewUuidKeyedCollectionKeysByObjectType uses unique bucket keys', () => {
        const bucketKeys = Object.values(reviewUuidKeyedCollectionKeysByObjectType);
        expect(new Set(bucketKeys).size).toBe(bucketKeys.length);
    });
});
