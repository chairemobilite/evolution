/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { Audit } from './types';

/**
 * Interface for audited objects.
 * @template T The type of the audited object (Interview, Household, Person, etc.)
 */
export interface IAudited<T> {
    isValid(): Optional<boolean>;

    isCompleted(): Optional<boolean>;

    isQuestionable(): Optional<boolean>;

    setIsValid(isValid: boolean): void;

    setIsCompleted(isCompleted: boolean): void;

    setIsQuestionable(isQuestionable: boolean): void;

    getAudits(): Audit[];

    getAuditedObject(): T;
}
