/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
export interface IValidatable {
    _isValid: Optional<boolean>; // undefined means not yet validated

    validate(): Optional<boolean>;

    isValid(): Optional<boolean>;
}

