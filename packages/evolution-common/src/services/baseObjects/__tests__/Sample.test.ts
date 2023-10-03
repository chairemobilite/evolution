/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Sample } from '../Sample';
import { v4 as uuidV4 } from 'uuid';

describe('Sample Class', () => {

    const sampleName = 'Sample Name';
    const sampleShortname = 'sample_name';

    it('should instantiate with the provided UUID', () => {
        const validUuid = uuidV4();
        const sampleInstance = new Sample({ _uuid: validUuid, name: sampleName, shortname: sampleShortname });
        expect(sampleInstance['_uuid']).toEqual(validUuid); // accessing the protected property for testing purposes
    });

    it('should throw an error when instantiated with an invalid UUID', () => {
        const invalidUuid = 'invalid-uuid';
        expect(() => new Sample({ _uuid: invalidUuid, name: sampleName, shortname: sampleShortname })).toThrow('Uuidable: invalid uuid');
    });

    it('should correctly set name and shortname properties', () => {
        const sampleInstance = new Sample({ _uuid: uuidV4(), name: sampleName, shortname: sampleShortname });
        expect(sampleInstance.name).toEqual(sampleName);
        expect(sampleInstance.shortname).toEqual(sampleShortname);
    });
});
