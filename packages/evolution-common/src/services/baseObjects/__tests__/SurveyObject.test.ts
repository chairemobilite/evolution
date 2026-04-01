/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';

import { SurveyObject } from '../SurveyObject';
import {
    completableAttributeNames,
    type CompletableAttributeName,
    type CompletableAttributes
} from '../attributeTypes/CompletableAttributes';
import type { ValidatableAttributes } from '../IValidatable';

/** Minimal concrete subclass to exercise {@link SurveyObject} instance behavior. */
class TestSurveyObject extends SurveyObject {
    readonly _attributes: ValidatableAttributes & CompletableAttributes & { _uuid?: string };

    constructor(initial?: ValidatableAttributes & CompletableAttributes & { _uuid?: string }) {
        super(initial?._uuid ?? uuidV4());
        this._attributes = { ...initial };
    }
}

describe('SurveyObject', () => {
    describe('validateCompletableParams', () => {
        test('should accept missing completable keys', () => {
            expect(SurveyObject.validateCompletableParams({ _uuid: uuidV4() })).toHaveLength(0);
        });

        test('should accept boolean values for all completable keys', () => {
            const params = Object.fromEntries(
                completableAttributeNames.map((name) => [name, true])
            ) as Record<string, boolean>;
            expect(SurveyObject.validateCompletableParams(params)).toHaveLength(0);
        });

        test.each(completableAttributeNames)('should reject non-boolean %s', (attribute) => {
            const errors = SurveyObject.validateCompletableParams({ [attribute]: 'not-bool' }, 'TestObject');
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].message).toContain(attribute);
            expect(errors[0].message).toContain('TestObject');
        });
    });

    describe('instance', () => {
        test.each(completableAttributeNames)(
            'should map completable accessor %s to _attributes',
            (key) => {
                const obj = new TestSurveyObject({ _isValid: true });
                const o = obj as Pick<TestSurveyObject, CompletableAttributeName>;
                o[key] = true;
                expect(obj._attributes[key]).toBe(true);
                expect(o[key]).toBe(true);
                o[key] = false;
                expect(obj._attributes[key]).toBe(false);
                expect(o[key]).toBe(false);
                o[key] = undefined;
                expect(obj._attributes[key]).toBeUndefined();
                expect(o[key]).toBeUndefined();
            }
        );

        test('should expose IValidatable behavior', () => {
            const obj = new TestSurveyObject();
            expect(obj.isValid()).toBeUndefined();
            expect(obj.validate()).toBe(true);
            expect(obj.isValid()).toBe(true);
            obj._isValid = false;
            expect(obj.isValid()).toBe(false);
        });
    });
});
