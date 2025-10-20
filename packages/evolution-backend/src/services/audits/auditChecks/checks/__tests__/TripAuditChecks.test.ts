/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { runTripAuditChecks } from '../../AuditCheckRunners';
import type { TripAuditCheckFunction } from '../../AuditCheckContexts';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { createContextWithTrip } from './trip/testHelper';

describe('runTripAuditChecks - Integration', () => {
    const validUuid = uuidV4();


    it('should run all audit checks and return empty array when all checks pass', () => {
        const context = createContextWithTrip();

        // Mock audit checks that all pass (return undefined)
        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            TEST_CHECK_1: () => undefined,
            TEST_CHECK_2: () => undefined,
            TEST_CHECK_3: () => undefined
        };

        const audits = runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(0);
    });

    it('should aggregate results from multiple failing checks', () => {
        const context = createContextWithTrip(undefined, validUuid);

        // Mock audit checks where some fail (return audit objects)
        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            TEST_PASS: () => undefined,
            TEST_FAIL_1: (): AuditForObject => ({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'TEST_FAIL_1',
                version: 1,
                level: 'error',
                message: 'Test failure 1',
                ignore: false
            }),
            TEST_FAIL_2: (): AuditForObject => ({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'TEST_FAIL_2',
                version: 1,
                level: 'warning',
                message: 'Test failure 2',
                ignore: false
            })
        };

        const audits = runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(2);
        expect(audits.some((a) => a.errorCode === 'TEST_FAIL_1')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'TEST_FAIL_2')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'TEST_PASS')).toBe(false);
    });

    it('should handle empty audit checks object', () => {
        const context = createContextWithTrip();

        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {};

        const audits = runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(0);
    });
});
