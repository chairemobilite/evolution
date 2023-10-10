/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Survey } from '../Survey';
import { v4 as uuidV4 } from 'uuid';

describe('Survey Class', () => {

    const surveyName = 'Sample Survey';
    const surveyShortname = 'SS';
    const surveyStartDate = new Date(2023, 4, 15); // May 15, 2023
    const surveyEndDate = new Date(2023, 5, 15); // June 15, 2023

    it('should instantiate with the provided UUID', () => {
        const validUuid = uuidV4();
        const surveyInstance = new Survey({ _uuid: validUuid, name: surveyName, shortname: surveyShortname, startDate: surveyStartDate, endDate: surveyEndDate });
        expect(surveyInstance['_uuid']).toEqual(validUuid); // accessing the protected property for testing purposes
    });

    it('should throw an error when instantiated with an invalid UUID', () => {
        const invalidUuid = 'invalid-uuid';
        expect(() => new Survey({ _uuid: invalidUuid, name: surveyName, shortname: surveyShortname, startDate: surveyStartDate, endDate: surveyEndDate })).toThrow('Uuidable: invalid uuid');
    });

    it('should correctly set name, shortname, startDate, and endDate properties', () => {
        const surveyInstance = new Survey({ _uuid: uuidV4(), name: surveyName, shortname: surveyShortname, startDate: surveyStartDate, endDate: surveyEndDate });
        expect(surveyInstance.name).toEqual(surveyName);
        expect(surveyInstance.shortname).toEqual(surveyShortname);
        expect(surveyInstance.startDate).toEqual(surveyStartDate);
        expect(surveyInstance.endDate).toEqual(surveyEndDate);
    });

    it('should validate params', () => {

        // Valid attributes with an additional attribute
        expect(Survey.validateParams({ _uuid: uuidV4(), name: surveyName, shortname: surveyShortname, startDate: surveyStartDate, endDate: surveyEndDate })).toEqual([]);
        expect(Survey.validateParams({ _uuid: uuidV4(), name: surveyName, shortname: surveyShortname, startDate: surveyStartDate, endDate: surveyEndDate, additionalAttribute: 'additionalValue' })).toEqual([]);

        // Invalid name (should be a string)
        expect(Survey.validateParams({ name: 23, shortname: 'foo' })[0].message).toEqual('Survey validateParams: name should be a string');

        // Invalid shortname (should be a string)
        expect(Survey.validateParams({ name: 'bar', shortname: {} })[0].message).toEqual('Survey validateParams: shortname should be a string');

        // Invalid description (should be a string)
        expect(Survey.validateParams({ name: 'bar', shortname: 'foo', description: new Date() })[0].message).toEqual('Survey validateParams: description should be a string');

        // Invalid UUID
        const invalidUuid = Survey.validateParams({ name: 'bar', shortname: 'foo', _uuid: 'foo', startDate: surveyStartDate, endDate: surveyEndDate });
        expect(invalidUuid.length).toEqual(1);
        expect(invalidUuid[0].message).toEqual('Uuidable validateParams: invalid uuid');

        // Invalid dates:
        const invalidStartDate = Survey.validateParams({ name: 'bar', shortname: 'foo', startDate: 'foo', endDate: surveyEndDate });
        expect(invalidStartDate.length).toEqual(1);
        expect(invalidStartDate[0].message).toEqual('Survey validateParams: invalid startDate');
        const invalidEndDate = Survey.validateParams({ name: 'bar', shortname: 'foo', startDate: surveyStartDate, endDate: new Date('bar') });
        expect(invalidEndDate.length).toEqual(1);
        expect(invalidEndDate[0].message).toEqual('Survey validateParams: invalid endDate');
        const invalidEndDate2 = Survey.validateParams({ name: 'bar', shortname: 'foo', startDate: surveyStartDate, endDate: new Date('2021/34/45') });
        expect(invalidEndDate2.length).toEqual(1);
        expect(invalidEndDate2[0].message).toEqual('Survey validateParams: invalid endDate');

        // Missing required attributes:
        const missingRequired = Survey.validateParams({ });
        expect(missingRequired.length).toEqual(4);
        expect(missingRequired[0].message).toEqual('Survey validateParams: name is required');
        expect(missingRequired[1].message).toEqual('Survey validateParams: shortname is required');
        expect(missingRequired[2].message).toEqual('Survey validateParams: startDate is required');
        expect(missingRequired[3].message).toEqual('Survey validateParams: endDate is required');

    });
});
