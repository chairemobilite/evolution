/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { surveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';
import { reviewDecisionObjectTypes } from '../reviewDecisionObjectTypes.snapshot';

describe('reviewDecisionObjectTypes migration snapshot', () => {
    test('matches surveyObjectNames so enum drift is caught in CI', () => {
        expect([...reviewDecisionObjectTypes].sort()).toEqual([...surveyObjectNames].sort());
    });
});
