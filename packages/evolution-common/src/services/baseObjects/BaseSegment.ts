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

    baseVehicle?: BaseVehicle;

    modeCategory?: SAttr.ModeCategory; // TODO: remove this an include the mode category in the mode itself
    mode?: SAttr.Mode;
};

export type ExtendedSegmentAttributes = BaseSegmentAttributes & { [key: string]: any };

export class BaseSegment extends Uuidable implements IValidatable {
    _isValid: OptionalValidity;

    baseVehicle?: BaseVehicle;

    modeCategory?: SAttr.ModeCategory;
    mode?: SAttr.Mode;

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
    ];

    constructor(params: BaseSegmentAttributes | ExtendedSegmentAttributes) {
        super(params._uuid);

        this._isValid = undefined;

        this.modeCategory = params.modeCategory;
        this.mode = params.mode;
        this.baseVehicle = params.baseVehicle;
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
     * @returns BaseSegment | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseSegment | Error[] {
        const errors = BaseSegment.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseSegment(dirtyParams as ExtendedSegmentAttributes);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseSegment validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate modeCategory (if provided)
        if (dirtyParams.modeCategory !== undefined && typeof dirtyParams.modeCategory !== 'string') {
            errors.push(new Error('BaseSegment validateParams: modeCategory should be a string'));
        }

        // Validate mode (if provided)
        if (dirtyParams.mode !== undefined && typeof dirtyParams.mode !== 'string') {
            errors.push(new Error('BaseSegment validateParams: mode should be a string'));
        }

        // Validate baseVehicle (if provided)
        if (dirtyParams.baseVehicle !== undefined && !(dirtyParams.baseVehicle instanceof BaseVehicle)) {
            errors.push(new Error('BaseSegment validateParams: baseVehicle should be an instance of BaseVehicle'));
        }

        return errors;
    }
}
