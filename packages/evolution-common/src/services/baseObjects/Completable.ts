/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { Optional } from '../../types/Optional.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { completableAttributeNames, type CompletableAttributes } from './attributeTypes/CompletableAttributes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

type HasCompletableAttributes = {
    _attributes: CompletableAttributes;
};

const getCompletableAttributes = (instance: unknown): CompletableAttributes => {
    return (instance as HasCompletableAttributes)._attributes;
};

/**
 * Mixin that adds completeness boolean getters/setters.
 * The consuming class MUST have a `_attributes` property that includes CompletableAttributes.
 */
export const Completable = <TBase extends Constructor>(Base: TBase) => {
    class CompletableMixin extends Base {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            super(...args);
        }

        get hasMinimum(): Optional<boolean> {
            return getCompletableAttributes(this).hasMinimum;
        }

        set hasMinimum(value: Optional<boolean>) {
            getCompletableAttributes(this).hasMinimum = value;
        }

        get isCompleted(): Optional<boolean> {
            return getCompletableAttributes(this).isCompleted;
        }

        set isCompleted(value: Optional<boolean>) {
            getCompletableAttributes(this).isCompleted = value;
        }

        get isStarted(): Optional<boolean> {
            return getCompletableAttributes(this).isStarted;
        }

        set isStarted(value: Optional<boolean>) {
            getCompletableAttributes(this).isStarted = value;
        }
    }

    return CompletableMixin;
};

/**
 * Shared validation utility for completable attributes.
 */
export const validateCompletableParams = (
    dirtyParams: { [key: string]: unknown },
    displayName = 'Completable'
): Error[] => {
    const errors: Error[] = [];
    for (const attribute of completableAttributeNames) {
        errors.push(...ParamsValidatorUtils.isBoolean(attribute, dirtyParams[attribute], displayName));
    }
    return errors;
};
