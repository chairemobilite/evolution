/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';

describe('WeightMethod', () => {
    const validUUID = uuidV4();
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: validUUID,
        shortname: 'ShortName',
        name: 'Test Weight Method',
        description: 'Description of the weight method',
    };

    it('should create a new WeightMethod instance', () => {
        const weightMethod = new WeightMethod(weightMethodAttributes);
        expect(weightMethod).toBeInstanceOf(WeightMethod);
        expect(weightMethod._uuid).toEqual(validUUID);
        expect(weightMethod.shortname).toEqual('ShortName');
        expect(weightMethod.name).toEqual('Test Weight Method');
        expect(weightMethod.description).toEqual('Description of the weight method');
    });

    it('should create a new WeightMethod instance with minimal attributes', () => {
        const minimalAttributes: WeightMethodAttributes = {
            _uuid: validUUID,
            shortname: 'ShortName',
            name: 'Minimal Test Weight Method',
        };

        const weightMethod = new WeightMethod(minimalAttributes);
        expect(weightMethod).toBeInstanceOf(WeightMethod);
        expect(weightMethod._uuid).toEqual(validUUID);
        expect(weightMethod.shortname).toEqual('ShortName');
        expect(weightMethod.name).toEqual('Minimal Test Weight Method');
        expect(weightMethod.description).toBeUndefined();
    });
});
