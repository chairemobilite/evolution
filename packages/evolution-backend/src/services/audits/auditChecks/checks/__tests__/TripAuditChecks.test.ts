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


    it('should run all audit checks and return empty array when all checks pass', async () => {
        const context = createContextWithTrip();

        // Mock audit checks that all pass (return undefined)
        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            TEST_CHECK_1: () => undefined,
            TEST_CHECK_2: () => undefined,
            TEST_CHECK_3: () => undefined
        };

        const audits = await runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(0);
    });

    it('should aggregate results from multiple failing checks', async () => {
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

        const audits = await runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(2);
        expect(audits.some((a) => a.errorCode === 'TEST_FAIL_1')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'TEST_FAIL_2')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'TEST_PASS')).toBe(false);
    });

    it('should handle empty audit checks object', async () => {
        const context = createContextWithTrip();

        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {};

        const audits = await runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(0);
    });

    it('should handle async check functions that return Promise<AuditForObject>', async () => {
        const context = createContextWithTrip(undefined, validUuid);

        // Mock audit checks with async functions
        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            ASYNC_CHECK_1: async (): Promise<AuditForObject> => {
                return Promise.resolve({
                    objectType: 'trip',
                    objectUuid: validUuid,
                    errorCode: 'ASYNC_CHECK_1',
                    version: 1,
                    level: 'error',
                    message: 'Async failure 1',
                    ignore: false
                });
            },
            ASYNC_CHECK_2: async (): Promise<AuditForObject | undefined> => {
                return Promise.resolve({
                    objectType: 'trip',
                    objectUuid: validUuid,
                    errorCode: 'ASYNC_CHECK_2',
                    version: 1,
                    level: 'warning',
                    message: 'Async failure 2',
                    ignore: false
                });
            },
            ASYNC_PASS: async () => Promise.resolve(undefined)
        };

        const audits = await runTripAuditChecks(context, mockAuditChecks);

        expect(audits).toHaveLength(2);
        expect(audits.some((a) => a.errorCode === 'ASYNC_CHECK_1')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'ASYNC_CHECK_2')).toBe(true);
        expect(audits.some((a) => a.errorCode === 'ASYNC_PASS')).toBe(false);
    });

    it('should reject when a check throws synchronously', async () => {
        const context = createContextWithTrip(undefined, validUuid);

        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            PASSING_CHECK: (): AuditForObject => ({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'PASSING_CHECK',
                version: 1,
                level: 'error',
                message: 'This should succeed',
                ignore: false
            }),
            THROWING_CHECK: () => {
                throw new Error('Synchronous error');
            }
        };

        // Current implementation does not handle errors, so it will reject
        await expect(runTripAuditChecks(context, mockAuditChecks)).rejects.toThrow('Synchronous error');
    });

    it('should reject when a check returns rejected Promise', async () => {
        const context = createContextWithTrip(undefined, validUuid);

        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            PASSING_CHECK: (): AuditForObject => ({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'PASSING_CHECK',
                version: 1,
                level: 'error',
                message: 'This should succeed',
                ignore: false
            }),
            REJECTING_CHECK: async () => {
                return Promise.reject(new Error('Async rejection'));
            }
        };

        // Current implementation does not handle rejections, so it will reject
        await expect(runTripAuditChecks(context, mockAuditChecks)).rejects.toThrow('Async rejection');
    });

    it('should handle mixed sync/async checks and reject on first error', async () => {
        const context = createContextWithTrip(undefined, validUuid);

        const mockAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
            SYNC_PASS: () => undefined,
            SYNC_FAIL: (): AuditForObject => ({
                objectType: 'trip',
                objectUuid: validUuid,
                errorCode: 'SYNC_FAIL',
                version: 1,
                level: 'error',
                message: 'Sync failure',
                ignore: false
            }),
            ASYNC_PASS: async () => Promise.resolve(undefined),
            ASYNC_FAIL: async (): Promise<AuditForObject> => {
                return Promise.resolve({
                    objectType: 'trip',
                    objectUuid: validUuid,
                    errorCode: 'ASYNC_FAIL',
                    version: 1,
                    level: 'warning',
                    message: 'Async failure',
                    ignore: false
                });
            },
            THROWING_CHECK: () => {
                throw new Error('This check throws');
            }
        };

        // Current implementation rejects on the throwing check
        await expect(runTripAuditChecks(context, mockAuditChecks)).rejects.toThrow('This check throws');
    });
});
