/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Weightable, Weight } from './Weight';
import { Uuidable } from './Uuidable';

type BaseCLASSAttributes = {
    _uuid?: string;

    // custom attributes

} & Weightable;

type ExtendedCLASSAttributes = BaseCLASSAttributes & { [key: string]: any };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IBaseCLASSAttributes extends BaseCLASSAttributes {}

class BaseCLASS extends Uuidable implements IBaseCLASSAttributes, IValidatable {

    _isValid: OptionalValidity;
    _weights?: Weight[];

    constructor(params: BaseCLASSAttributes | ExtendedCLASSAttributes) {
        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;
    }

    validate(): OptionalValidity {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): OptionalValidity {
        return this._isValid;
    }


}

export {
    BaseCLASS,
    BaseCLASSAttributes,
    ExtendedCLASSAttributes
};
