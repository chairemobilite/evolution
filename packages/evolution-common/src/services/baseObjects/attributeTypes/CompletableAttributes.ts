/**
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../../types/Optional.type';

/*
hasMinimum: whether the object has minimum required attributes to be kept for export
isCompleted: whether the object has all required attributes
isStarted: whether the object has at least one attribute filled
*/
export const completableAttributeNames = ['hasMinimum', 'isCompleted', 'isStarted'] as const;

export type CompletableAttributes = {
    [K in (typeof completableAttributeNames)[number]]?: Optional<boolean>;
};
