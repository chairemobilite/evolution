/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';

import { mergeWithExisting, convertParamsErrorsToAudits } from '../AuditUtils';
import slugify from 'slugify';
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
            isWarning: false
        });
        expect(result[1]).toEqual({
            errorCode: slugify('Error message 2'),
            objectUuid: arbitraryUuid,
            objectType: 'interview',
            message: errors[1].message,
            version: 1,
            ignore: false,
            isWarning: false
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
                isWarning: false,
                ignore: true,
            },
            'outdated-error': {
                version: 1,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                isWarning: false,
                ignore: true,
            },
            'version-changed-error': {
                version: 1,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                isWarning: false,
                ignore: true,
            },
        };

        const newAudits: Audits = {
            'test-error': {
                version: 1,
                errorCode: 'test-error',
                message: 'Test error message updated',
                isWarning: true,
                ignore: false,
            },
            'version-changed-error': {
                version: 2,
                errorCode: 'oudated-error',
                message: 'Outdated error message',
                isWarning: false,
                ignore: false,
            },
        };

        const mergedAudits = mergeWithExisting(existingAudits, newAudits);

        expect(Object.keys(mergedAudits).length).toEqual(Object.keys(newAudits).length);
        expect(mergedAudits['test-error'].ignore).toBe(true);
        expect(mergedAudits['test-error'].isWarning).toBe(true);
        expect(mergedAudits['outdated-error']).toBeUndefined();
        expect(mergedAudits['version-changed-error'].version).toBe(2);
        expect(mergedAudits['version-changed-error'].ignore).toBe(false);
    });
});
