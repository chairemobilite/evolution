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
});
