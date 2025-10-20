/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { personAuditChecks } from '../../PersonAuditChecks';
import { createContextWithPerson } from './testHelper';

describe('P_M_Age audit check', () => {
    const validUuid = uuidV4();

    it('should pass when person has valid age', () => {
        const context = createContextWithPerson({ age: 30 });

        const result = personAuditChecks.P_M_Age(context);

        expect(result).toBeUndefined();
    });

    it('should error when person age is undefined', () => {
        const context = createContextWithPerson({ age: undefined }, validUuid);

        const result = personAuditChecks.P_M_Age(context);

        expect(result).toMatchObject({
            objectType: 'person',
            objectUuid: validUuid,
            errorCode: 'P_M_Age',
            version: 1,
            level: 'error',
            message: 'Person age is missing',
            ignore: false
        });
    });

    it('should error when person age is null', () => {
        const context = createContextWithPerson({ age: null as unknown as number }, validUuid);

        const result = personAuditChecks.P_M_Age(context);

        expect(result).toMatchObject({
            objectType: 'person',
            objectUuid: validUuid,
            errorCode: 'P_M_Age',
            version: 1,
            level: 'error',
            message: 'Person age is missing',
            ignore: false
        });
    });

});

