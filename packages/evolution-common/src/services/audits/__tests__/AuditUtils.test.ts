/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import _omit from 'lodash/omit';

import { auditArrayToAudits, auditsToAuditArray } from '../AuditUtils';

const arbitraryUuid = uuidV4();
const arbitraryUuid2 = uuidV4();

describe('auditArrayToAudits', () => {
    it('should convert an audit array to object audits', async () => {

        // Create audits for 3 objects, 2 audits for interview, 1 for each other object
        const audits = [{
            version: 1,
            errorCode: 'test-error',
            message: 'Test error message',
            level: 'error' as const,
            ignore: true,
            objectType: 'interview',
            objectUuid: arbitraryUuid
        }, {
            version: 1,
            errorCode: 'test-error-2',
            message: 'Test error message',
            level: 'error' as const,
            ignore: true,
            objectType: 'interview',
            objectUuid: arbitraryUuid
        }, {
            version: 1,
            errorCode: 'test-error',
            message: 'Test error message',
            level: 'error' as const,
            ignore: true,
            objectType: 'person',
            objectUuid: arbitraryUuid
        }, {
            version: 1,
            errorCode: 'test-error',
            message: 'Test error message',
            level: 'error' as const,
            ignore: true,
            objectType: 'person',
            objectUuid: arbitraryUuid2
        }];

        const perObjectAudits = auditArrayToAudits(audits);

        expect(Object.keys(perObjectAudits).length).toEqual(3);
        expect(perObjectAudits[`interview.${arbitraryUuid}`]).toEqual({
            'test-error': _omit(audits[0], ['objectUuid', 'objectType']),
            'test-error-2': _omit(audits[1], ['objectUuid', 'objectType'])
        });
        expect(perObjectAudits[`person.${arbitraryUuid}`]).toEqual({
            'test-error': _omit(audits[2], ['objectUuid', 'objectType'])
        });
        expect(perObjectAudits[`person.${arbitraryUuid}`]).toEqual({
            'test-error': _omit(audits[3], ['objectUuid', 'objectType'])
        });
    });
});

describe('auditsToAuditArray', () => {
    it('should convert an audits object to audit array', async () => {

        const auditObject = {
            'test-error': {
                version: 1,
                errorCode: 'test-error',
                message: 'Test error message',
                level: 'error' as const,
                ignore: true
            }, 'test-error-2': {
                version: 1,
                errorCode: 'test-error-2',
                message: 'Test error message',
                level: 'error' as const,
                ignore: true
            }
        };
        const expectedAudits = [{
            version: 1,
            errorCode: 'test-error',
            message: 'Test error message',
            level: 'error' as const,
            ignore: true,
            objectType: 'interview',
            objectUuid: arbitraryUuid
        }, {
            version: 1,
            errorCode: 'test-error-2',
            message: 'Test error message',
            level: 'error' as const,
            ignore: true,
            objectType: 'interview',
            objectUuid: arbitraryUuid
        }];

        const auditsArr = auditsToAuditArray(auditObject, { objectType: 'interview', objectUuid: arbitraryUuid });

        expect(auditsArr.length).toEqual(2);
        expect(auditsArr).toEqual(expectedAudits);
    });
});
