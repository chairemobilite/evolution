/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4, validate as uuidValidate } from 'uuid';
import { Optional } from '../../types/Optional.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';

export type UuidableAttributes = {
    _uuid?: Optional<string>; // UUID v4
};

export class Uuidable {
    readonly _uuid?: Optional<string>; // UUID v4 // required, will be generated if undefined in constructor

    constructor(_uuid?: Optional<string>) {
        this._uuid = Uuidable.getUuid(_uuid);
    }

    get uuid(): Optional<string> {
        return this._uuid;
    }

    static getUuid(_uuid?: Optional<string>) {
        if (_uuid && !uuidValidate(_uuid)) {
            throw new Error('Uuidable: invalid uuid');
        } else if (_uuid) {
            return _uuid;
        } else {
            return uuidV4();
        }
    }

    /**
     * validates provided _uuid in params
     * @param dirtyParams the params input
     * @param displayName the name of the object being validated
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: any }, displayName?: string): Error[] {
        const errors: Error[] = [];
        errors.push(
            ...ParamsValidatorUtils.isUuid(
                '_uuid',
                dirtyParams._uuid,
                displayName ? displayName + ' Uuidable' : 'Uuidable'
            )
        );
        return errors;
    }
}
