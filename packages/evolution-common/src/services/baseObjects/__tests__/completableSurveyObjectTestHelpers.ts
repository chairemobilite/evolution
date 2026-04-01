/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { hasErrors, type Result } from '../../../types/Result.type';
import {
    completableAttributeNames,
    type CompletableAttributeName
} from '../attributeTypes/CompletableAttributes';
import type { SurveyObject } from '../SurveyObject';
import type { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

/**
 * Rows for `test.each` when asserting `validateParams` rejects non-boolean completable fields.
 */
export function completableInvalidParamRows(): [string, string][] {
    return completableAttributeNames.map((name) => [name, 'invalid']);
}

const COMPLETABLE_GET_SET_VALUES = [undefined, true, false] as const;

/**
 * Completability helpers on {@link SurveyObject}: defaults stay empty, then getters/setters round-trip
 * `undefined`, `true`, and `false` for every name in {@link completableAttributeNames}.
 */
export function describeCompletableSurveyObjectMixinValues<T extends SurveyObject>(options: {
    createDefault: () => T;
}): void {
    describe('completeness mixin values', () => {
        test('should leave every completable attribute undefined when not provided', () => {
            const o = options.createDefault();
            for (const name of completableAttributeNames) {
                expect(o[name]).toBeUndefined();
            }
        });

        const getSetCases = completableAttributeNames.flatMap((key) =>
            COMPLETABLE_GET_SET_VALUES.map((value) => [key, value] as const)
        );

        test.each(getSetCases)('should get and set %s as %s', (key, value) => {
            const instance = options.createDefault();
            const o = instance as Pick<T, CompletableAttributeName>;
            o[key] = value;
            expect(o[key]).toBe(value);
        });
    });
}

/**
 * Runs one test per completable key; use the callback to assert validation/create fails.
 */
export function describeEachCompletableKeyRejectsNonBoolean(
    describeTitle: string,
    testNameTemplate: string,
    fn: (key: CompletableAttributeName) => void
): void {
    describe(describeTitle, () => {
        test.each(completableAttributeNames)(testNameTemplate, (key) => {
            fn(key as CompletableAttributeName);
        });
    });
}

/**
 * Shared suite: the class’s static `create` method must reject non-boolean values for each completable field.
 * Use for every {@link SurveyObject} subclass that exposes `create(dirtyParams, registry): Result<T>`.
 * Example: `describeCreateRejectsNonBooleanCompletableParams('Household', Household.create, () => validAttrs, () => registry)`.
 */
export function describeCreateRejectsNonBooleanCompletableParams<T>(
    classLabel: string,
    create: (
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ) => Result<T>,
    buildValidParams: () => { [key: string]: unknown },
    getRegistry: () => SurveyObjectsRegistry,
    describeTitle = 'validateParams (completable)'
): void {
    const testNameTemplate = `should reject non-boolean %s via ${classLabel}.create`;

    describe(describeTitle, () => {
        test.each(completableAttributeNames)(testNameTemplate, (key) => {
            const result = create(
                { ...buildValidParams(), [key]: 'not-a-boolean' },
                getRegistry()
            );
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors[0].message).toContain(key);
            }
        });
    });
}
