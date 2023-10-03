/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A segment is the part of a trip using a single mode of transport
 */

import { BaseVehicle } from './BaseVehicle';
import { Uuidable } from './Uuidable';
import { OptionalValidity, IValidatable } from './Validatable';
import * as SAttr from './attributeTypes/SegmentAttributes';

export type BaseSegmentAttributes = {

    _uuid?: string;

    vehicle?: BaseVehicle;

    modeCategory?: SAttr.ModeCategory; // TODO: remove this an include the mode category in the mode itself
    mode?: SAttr.Mode;

};

export type ExtendedSegmentAttributes = BaseSegmentAttributes & {[key: string]: any};

export class BaseSegment extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;

    vehicle?: BaseVehicle;

    modeCategory?: SAttr.ModeCategory;
    mode?: SAttr.Mode;

    constructor(params: BaseSegmentAttributes | ExtendedSegmentAttributes) {

        super(params._uuid);

        this._isValid = undefined;

        this.modeCategory = params.modeCategory;
        this.mode = params.mode;
        this.vehicle = params.vehicle;

    }

    validate(): OptionalValidity {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): OptionalValidity {
        return this._isValid;
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns BaseSegment
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseSegmentAttributes = {};
        if (allParamsValid === true) {
            return new BaseSegment(params);
        }
    }

}
