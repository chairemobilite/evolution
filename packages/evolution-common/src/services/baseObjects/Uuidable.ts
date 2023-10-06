/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    v4 as uuidV4, validate as uuidValidate
} from 'uuid';

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

}
