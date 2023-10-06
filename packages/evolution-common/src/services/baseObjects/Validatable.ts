/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export type OptionalValidity = boolean | undefined;

export interface IValidatable {

    _isValid: OptionalValidity; // undefined means not yet validated

    validate(): OptionalValidity;

    isValid(): OptionalValidity;

}
