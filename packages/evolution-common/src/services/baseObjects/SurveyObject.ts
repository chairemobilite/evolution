/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { Optional } from '../../types/Optional.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { IValidatable, ValidatableAttributes } from './IValidatable';
import { Uuidable } from './Uuidable';
import { completableAttributeNames, type CompletableAttributes } from './attributeTypes/CompletableAttributes';

type InstanceWithCompletableAttributes = {
    _attributes: CompletableAttributes;
};

type InstanceWithValidationAttributes = {
    _attributes: ValidatableAttributes;
};

/**
 * Base class for survey entities registered in {@link SurveyObjectsRegistry}.
 * Implements {@link IValidatable}: `_isValid` on `_attributes`, plus {@link validate} / {@link isValid}.
 * Extends {@link Uuidable} and holds **completeness** flags (`hasMinimum`, `isStarted`, `isCompleted`)
 * on the subclass `_attributes` object (see {@link CompletableAttributes}).
 *
 * **Subclass contract:** concrete classes must expose a `_attributes` object that includes
 * `CompletableAttributes`; the constructor should list completable keys in the attribute list passed
 * to {@link ConstructorUtils.initializeAttributes} (or equivalent) so values are not treated as custom attributes.
 *
 * **Good candidates to move here later (not done yet):** shared references such as
 * `SurveyObjectsRegistry`, common serialization hooks, or generic `validateParams` fragments—only
 * where every survey entity behaves identically—to avoid pulling composed-only types
 * (e.g. {@link Address}, {@link Routing}) into this hierarchy.
 */
export abstract class SurveyObject extends Uuidable implements IValidatable {
    constructor(_uuid?: Optional<string>) {
        super(_uuid);
    }

    protected getValidatableAttributes(): ValidatableAttributes {
        return (this as unknown as InstanceWithValidationAttributes)._attributes;
    }

    get _isValid(): Optional<boolean> {
        return this.getValidatableAttributes()._isValid;
    }

    set _isValid(value: Optional<boolean>) {
        this.getValidatableAttributes()._isValid = value;
    }

    validate(): Optional<boolean> {
        this.getValidatableAttributes()._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    protected getCompletableAttributes(): CompletableAttributes {
        return (this as unknown as InstanceWithCompletableAttributes)._attributes;
    }

    get hasMinimum(): Optional<boolean> {
        return this.getCompletableAttributes().hasMinimum;
    }

    set hasMinimum(value: Optional<boolean>) {
        this.getCompletableAttributes().hasMinimum = value;
    }

    get isCompleted(): Optional<boolean> {
        return this.getCompletableAttributes().isCompleted;
    }

    set isCompleted(value: Optional<boolean>) {
        this.getCompletableAttributes().isCompleted = value;
    }

    get isStarted(): Optional<boolean> {
        return this.getCompletableAttributes().isStarted;
    }

    set isStarted(value: Optional<boolean>) {
        this.getCompletableAttributes().isStarted = value;
    }

    /**
     * Validates completable boolean fields on a plain params object (for `create` / `validateParams`).
     */
    static validateCompletableParams(dirtyParams: { [key: string]: unknown }, displayName = 'Completable'): Error[] {
        const errors: Error[] = [];
        for (const attribute of completableAttributeNames) {
            errors.push(...ParamsValidatorUtils.isBoolean(attribute, dirtyParams[attribute], displayName));
        }
        return errors;
    }
}
