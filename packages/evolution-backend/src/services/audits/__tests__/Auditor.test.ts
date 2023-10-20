/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import _omit from 'lodash/omit';

import Auditor from '../Auditor';

type ArbitraryObject = {
    a: number;
    b: string;
    c: boolean;
};

describe('auditObject', () => {

    const validations = {
        'error-code-ok': (value: ArbitraryObject) => undefined,
        'error-code-with-minimal-info': (value: ArbitraryObject) => ({ version: 2 }),
        'error-code-with-more-info': (value: ArbitraryObject) => ({ version: 3, isWarning: true, message: 'SomeMessageKey' }),
        'error-code-without-version': (value: ArbitraryObject) => ({ message: 'OtherMessageKey' })
    }

    it('should audit object and return audits', async () => {
        const arbitraryUuid = uuidV4();
        const results = Auditor.auditObject({ a: 2, b: 'test', c: true }, validations, { objectType: 'test', objectUuid: arbitraryUuid});

        expect(results).toEqual([{
            errorCode: 'error-code-with-minimal-info',
            objectUuid: arbitraryUuid,
            objectType: 'test',
            version: 2,
        }, {
            errorCode: 'error-code-with-more-info',
            objectUuid: arbitraryUuid,
            objectType: 'test',
            message: 'SomeMessageKey',
            version: 3,
            isWarning: true
        }, {
            errorCode: 'error-code-without-version',
            objectUuid: arbitraryUuid,
            objectType: 'test',
            message: 'OtherMessageKey',
            version: 1
        }]);
    });
});
