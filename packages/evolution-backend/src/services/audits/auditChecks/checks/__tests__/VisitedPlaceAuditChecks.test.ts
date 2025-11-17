/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { runVisitedPlaceAuditChecks } from '../../AuditCheckRunners';
import type { VisitedPlaceAuditCheckFunction } from '../../AuditCheckContexts';
import { createContextWithVisitedPlace } from './visitedPlace/testHelper';

describe('runVisitedPlaceAuditChecks - Integration', () => {
    const validUuid = uuidV4();

    it('should run all audit checks and return empty array when all checks pass', async () => {
        const context = createContextWithVisitedPlace();

        // Mock audit checks that all pass (return undefined)
        const mockAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
            TEST_CHECK_1: () => undefined,
            TEST_CHECK_2: () => undefined,
            TEST_CHECK_3: () => undefined
        };

        const audits = await runVisitedPlaceAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(0);
    });

    it('should aggregate results from multiple failing checks', async () => {
        const context = createContextWithVisitedPlace(undefined, validUuid);

        // Mock audit checks where some fail (return audit objects)
        const mockAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
            TEST_PASS: () => undefined,
            TEST_FAIL_1: () => ({
                objectUuid: validUuid,
                objectType: 'visitedPlace',
                errorCode: 'TEST_FAIL_1',
                version: 1,
                level: 'error',
                message: 'Test failure 1',
                ignore: false
            }),
            TEST_FAIL_2: () => ({
                objectUuid: validUuid,
                objectType: 'visitedPlace',
                errorCode: 'TEST_FAIL_2',
                version: 1,
                level: 'warning',
                message: 'Test failure 2',
                ignore: false
            })
        };

        const audits = await runVisitedPlaceAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(2);
        expect(audits.some((a) => a.errorCode === 'TEST_FAIL_1')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'TEST_FAIL_2')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'TEST_PASS')).toBe(false);
        expect(audits.every((a) => a.objectType === 'visitedPlace' && a.objectUuid === validUuid)).toBe(true);
        const fail1 = audits.find((a) => a.errorCode === 'TEST_FAIL_1')!;
        expect(fail1.level).toBe('error');
        expect(fail1.message).toBe('Test failure 1');
        expect(fail1.version).toBe(1);
        const fail2 = audits.find((a) => a.errorCode === 'TEST_FAIL_2')!;
        expect(fail2.level).toBe('warning');
        expect(fail2.message).toBe('Test failure 2');
        expect(fail2.version).toBe(1);
    });

    it('should handle empty audit checks object', async () => {
        const context = createContextWithVisitedPlace();

        const mockAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {};

        const audits = await runVisitedPlaceAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(0);
    });

    it('should await async check functions and aggregate results correctly', async () => {
        const context = createContextWithVisitedPlace(undefined, validUuid);

        // Mock audit checks with async functions
        const mockAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
            ASYNC_CHECK_PASS: async () => {
                // Simulate async work
                await new Promise((resolve) => setTimeout(resolve, 10));
                return undefined;
            },
            ASYNC_CHECK_FAIL: async () => {
                // Simulate async work
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {
                    objectUuid: validUuid,
                    objectType: 'visitedPlace',
                    errorCode: 'ASYNC_CHECK_FAIL',
                    version: 1,
                    level: 'error',
                    message: 'Async check failure',
                    ignore: false
                };
            },
            SYNC_CHECK_FAIL: () => ({
                objectUuid: validUuid,
                objectType: 'visitedPlace',
                errorCode: 'SYNC_CHECK_FAIL',
                version: 1,
                level: 'warning',
                message: 'Sync check failure',
                ignore: false
            })
        };

        const audits = await runVisitedPlaceAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(2);
        expect(audits.some((a) => a.errorCode === 'ASYNC_CHECK_FAIL')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'SYNC_CHECK_FAIL')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'ASYNC_CHECK_PASS')).toBe(false);
    });

    it('should propagate errors when a check throws an exception', async () => {
        const context = createContextWithVisitedPlace(undefined, validUuid);

        // Mock audit checks where one throws an error
        const mockAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
            TEST_CHECK_PASS: () => undefined,
            TEST_CHECK_THROWS: () => {
                throw new Error('Check function threw an error');
            }
        };

        await expect(runVisitedPlaceAuditChecks(context, mockAuditChecks)).rejects.toThrow(
            'Check function threw an error'
        );
    });

    it('should propagate errors when an async check rejects', async () => {
        const context = createContextWithVisitedPlace(undefined, validUuid);

        // Mock audit checks where one returns a rejected Promise
        const mockAuditChecks: { [errorCode: string]: VisitedPlaceAuditCheckFunction } = {
            TEST_CHECK_PASS: () => undefined,
            TEST_CHECK_REJECTS: async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                throw new Error('Async check rejected');
            }
        };

        await expect(runVisitedPlaceAuditChecks(context, mockAuditChecks)).rejects.toThrow('Async check rejected');
    });
});
