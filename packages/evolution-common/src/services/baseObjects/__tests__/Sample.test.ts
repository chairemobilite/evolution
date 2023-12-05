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

    it('should validate params', () => {
        const validSampleAttributes = {
            _uuid: uuidV4(),
            name: 'Sample Name',
            shortname: 'SN',
            description: 'Sample description',
        };

        // Valid attributes
        expect(Sample.validateParams(validSampleAttributes)).toEqual([]);

        // Valid attributes with an additional attribute
        const validSampleAttributesWithAdditional = { ...validSampleAttributes, additionalAttribute: 'additionalValue' };
        expect(Sample.validateParams(validSampleAttributesWithAdditional)).toEqual([]);

        // Invalid name (should be a string)
        const invalidName = Sample.validateParams({ ...validSampleAttributes, name: 23 });
        expect(invalidName.length).toEqual(1);
        expect(invalidName[0].message).toEqual('Sample validateParams: name should be a string');

        // Invalid shortname (should be a string)
        const invalidShortname = Sample.validateParams({ ...validSampleAttributes, shortname: {} });
        expect(invalidShortname.length).toEqual(1);
        expect(invalidShortname[0].message).toEqual('Sample validateParams: shortname should be a string');

        // Invalid description (should be a string)
        const invalidDescription = Sample.validateParams({ ...validSampleAttributes, description: new Date() });
        expect(invalidDescription.length).toEqual(1);
        expect(invalidDescription[0].message).toEqual('Sample validateParams: description should be a string');

        // Invalid UUID
        const invalidUuid = Sample.validateParams({ _uuid: 'foo', name: 'Sample Name', shortname: 'SN' });
        expect(invalidUuid.length).toEqual(1);
        expect(invalidUuid[0].message).toEqual('Uuidable validateParams: invalid uuid');

        // Missing required attributes:
        const missingRequired = Sample.validateParams({});
        expect(missingRequired.length).toEqual(2);
        expect(missingRequired[0].message).toEqual('Sample validateParams: name is required');
        expect(missingRequired[1].message).toEqual('Sample validateParams: shortname is required');
    });

});
