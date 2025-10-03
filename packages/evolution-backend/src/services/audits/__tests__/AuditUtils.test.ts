/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import slugify from 'slugify';

import { mergeWithExisting, convertParamsErrorsToAudits } from '../AuditUtils';
import { Audits } from 'evolution-common/lib/services/audits/types';

const arbitraryUuid = uuidV4();

describe('convertParamsErrorsToAudits', () => {
    it('should convert error messages to audits', async () => {
        const errors = [new Error('Error message 1'), new Error('Error message 2')];
        const result = convertParamsErrorsToAudits(errors, { objectType: 'interview', objectUuid: arbitraryUuid });

        expect(result[0]).toEqual({
            errorCode: slugify('Error message 1'),
            objectUuid: arbitraryUuid,
            objectType: 'interview',
            message: errors[0].message,
            version: 1,
            ignore: false,
            level: 'error'
        });
        expect(result[1]).toEqual({
            errorCode: slugify('Error message 2'),
            objectUuid: arbitraryUuid,
            objectType: 'interview',
            message: errors[1].message,
            version: 1,
            ignore: false,
            level: 'error'
        });
    });
});

describe('mergeWithExisting', () => {
    it('should merge new audits with existing audits', async () => {
        const existingAudits: Audits = {
            'test-error': {
                version: 1,
                errorCode: 'test-error',
                message: 'Test error message',
                level: 'error',
                ignore: true,
            },
            'outdated-error': {
                version: 1,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                level: 'error',
                ignore: true,
            },
            'version-changed-error': {
                version: 1,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                level: 'error',
                ignore: true,
            },
        };

        const newAudits: Audits = {
            'test-error': {
                version: 1,
                errorCode: 'test-error',
                message: 'Test error message updated',
                level: 'warning',
                ignore: false,
            },
            'version-changed-error': {
                version: 2,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                level: 'error',
                ignore: false,
            },
        };

        const mergedAudits = mergeWithExisting(existingAudits, newAudits);

        expect(Object.keys(mergedAudits).length).toEqual(Object.keys(newAudits).length);
        expect(mergedAudits['test-error'].ignore).toBe(true);
        expect(mergedAudits['test-error'].level).toBe('warning');
        expect(mergedAudits['outdated-error']).toBeUndefined();
        expect(mergedAudits['version-changed-error'].version).toBe(2);
        expect(mergedAudits['version-changed-error'].ignore).toBe(false);
    });
});
