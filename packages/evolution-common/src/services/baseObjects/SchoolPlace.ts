/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable } from './IValidatable';
import * as PlAttr from './attributeTypes/PlaceAttributes';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Place, PlaceAttributes, placeAttributes } from './Place';
import { Result, createErrors, createOk } from '../../types/Result.type';

export const schoolPlaceAttributes = [...placeAttributes, 'parkingType', 'parkingFeeType'];

export type SchoolPlaceAttributes = {
    parkingType?: Optional<PlAttr.ParkingType>;
    parkingFeeType?: Optional<PlAttr.SchoolParkingFeeType>;
} & PlaceAttributes;

export type ExtendedSchoolPlaceAttributes = SchoolPlaceAttributes & { [key: string]: unknown };

/*
 * A school place is a place associated with a person
 * where they go to school on a regular basis (usual school place)
 */
export class SchoolPlace extends Place<SchoolPlaceAttributes> implements IValidatable {
    static _confidentialAttributes = [];

    constructor(params: ExtendedSchoolPlaceAttributes) {
        super(params, schoolPlaceAttributes);
    }

    get parkingType(): Optional<PlAttr.ParkingType> {
        return this._attributes.parkingType;
    }

    set parkingType(value: Optional<PlAttr.ParkingType>) {
        this._attributes.parkingType = value;
    }

    get parkingFeeType(): Optional<PlAttr.SchoolParkingFeeType> {
        return this._attributes.parkingFeeType;
    }

    set parkingFeeType(value: Optional<PlAttr.SchoolParkingFeeType>) {
        this._attributes.parkingFeeType = value;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: ExtendedSchoolPlaceAttributes): SchoolPlace {
        return new SchoolPlace(params);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns SchoolPlace | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<SchoolPlace> {
        const errors = SchoolPlace.validateParams(dirtyParams);
        const schoolPlace = errors.length === 0 ? new SchoolPlace(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(schoolPlace as SchoolPlace);
    }

    validate(): Optional<boolean> {
        // TODO: implement:
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    /**
     * Validates attributes types for SchoolPlace.
     * @param dirtyParams The parameters to validate.
     * @param displayName The name of the object to validate, for error display
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'SchoolPlace'): Error[] {
        const errors: Error[] = [];

        errors.push(...Place.validateParams(dirtyParams, displayName));

        // validate attributes:
        errors.push(...ParamsValidatorUtils.isString('parkingType', dirtyParams.parkingType, displayName));

        errors.push(...ParamsValidatorUtils.isString('parkingFeeType', dirtyParams.parkingFeeType, displayName));

        return errors;
    }
}
