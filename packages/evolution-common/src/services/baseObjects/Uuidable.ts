/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4, validate as uuidValidate } from 'uuid';

export class Uuidable {
    _uuid: string;

    constructor(_uuid?: string) {
        if (_uuid && !uuidValidate(_uuid)) {
            throw new Error('Uuidable: invalid uuid');
        } else if (_uuid) {
            this._uuid = _uuid;
        } else {
            this._uuid = uuidV4();
        }
    }

    /**
     * validates provided _uuid in params
     * @param dirtyParams the params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        if (dirtyParams === undefined || typeof dirtyParams !== 'object') {
            return [new Error('Uuidable validateParams: params is undefined or invalid')];
        } else if (dirtyParams._uuid === undefined || uuidValidate(dirtyParams._uuid)) {
            return [];
        } else {
            return [new Error('Uuidable validateParams: invalid uuid')];
        }
    }
}
