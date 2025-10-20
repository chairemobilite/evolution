/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';

describe('J_M_StartDate audit check', () => {
    const validUuid = uuidV4();

    it('should pass when journey has start date', () => {
        const context = createContextWithJourney({ startDate: '2023-10-15' });

        const result = journeyAuditChecks.J_M_StartDate(context);

        expect(result).toBeUndefined();
    });

    it('should error when journey start date is missing', () => {
        const context = createContextWithJourney({ startDate: undefined }, validUuid);

        const result = journeyAuditChecks.J_M_StartDate(context);

        expect(result).toMatchObject({
            objectType: 'journey',
            objectUuid: validUuid,
            errorCode: 'J_M_StartDate',
            version: 1,
            level: 'error',
            message: 'Journey start date is missing',
            ignore: false
        });
    });

    it('should error when journey start date is null', () => {
        const context = createContextWithJourney({ startDate: null as unknown as string }, validUuid);

        const result = journeyAuditChecks.J_M_StartDate(context);

        expect(result).toMatchObject({
            objectType: 'journey',
            objectUuid: validUuid,
            errorCode: 'J_M_StartDate',
            version: 1,
            level: 'error',
            message: 'Journey start date is missing',
            ignore: false
        });
    });

});
