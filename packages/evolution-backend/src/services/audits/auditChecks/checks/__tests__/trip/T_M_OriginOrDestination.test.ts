/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { tripAuditChecks } from '../../TripAuditChecks';
import { createContextWithTrip } from './testHelper';
import { createMockVisitedPlace } from '../visitedPlace/testHelper';

describe('T_M_OriginOrDestination audit check', () => {
    const validUuid = uuidV4();
    const origin = createMockVisitedPlace();
    const destination = createMockVisitedPlace();

    test.each([
        {
            description: 'both ends present',
            origin,
            destination,
            shouldError: false
        },
        {
            description: 'origin missing',
            origin: undefined,
            destination,
            shouldError: true
        },
        {
            description: 'destination missing',
            origin,
            destination: undefined,
            shouldError: true
        },
        {
            description: 'neither end present',
            origin: undefined,
            destination: undefined,
            shouldError: true
        }
    ])('$description', ({ origin, destination, shouldError }) => {
        const context = createContextWithTrip({ origin, destination }, validUuid);

        const result = tripAuditChecks.T_M_OriginOrDestination(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'trip',
            objectUuid: validUuid,
            errorCode: 'T_M_OriginOrDestination',
            version: 1,
            level: 'error',
            message: 'Trip is missing origin or destination',
            ignore: false
        });
    });
});
