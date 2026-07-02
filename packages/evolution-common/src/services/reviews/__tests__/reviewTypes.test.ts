/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { surveyObjectNames, type ParentSurveyObjects } from '../../baseObjects/types';
import { reviewUuidKeyedCollectionKeysByObjectType } from '../types';

/** Parent-level survey objects (see ParentSurveyObjects); not stored in uuid-keyed review buckets. */
const singletonSurveyObjectNames: readonly (keyof ParentSurveyObjects)[] = ['interview', 'household', 'home'];

describe('review review bucket types', () => {
    test('reviewUuidKeyedCollectionKeysByObjectType covers every non-singleton survey object name', () => {
        const uuidKeyedSurveyObjectNames = surveyObjectNames.filter(
            (name) => !(singletonSurveyObjectNames as readonly string[]).includes(name)
        );

        expect(Object.keys(reviewUuidKeyedCollectionKeysByObjectType).sort()).toEqual(
            uuidKeyedSurveyObjectNames.sort()
        );
    });

    test('reviewUuidKeyedCollectionKeysByObjectType uses unique bucket keys', () => {
        const bucketKeys = Object.values(reviewUuidKeyedCollectionKeysByObjectType);
        expect(new Set(bucketKeys).size).toBe(bucketKeys.length);
    });
});
