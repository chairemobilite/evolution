/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { homeAuditChecks } from '../../HomeAuditChecks';
import { createContextWithHome } from './testHelper';

describe('HM_M_Geography audit check', () => {
    const validUuid = uuidV4();

    it('should pass when home has valid geography', () => {
        const context = createContextWithHome(undefined, validUuid);

        const result = homeAuditChecks.HM_M_Geography(context);

        expect(result).toBeUndefined();
    });

    it('should error when home has no geography', () => {
        const context = createContextWithHome({ geography: undefined }, validUuid);

        const result = homeAuditChecks.HM_M_Geography(context);

        expect(result).toMatchObject({
            objectType: 'home',
            objectUuid: validUuid,
            errorCode: 'HM_M_Geography',
            version: 1,
            level: 'error',
            message: 'Home geography is missing',
            ignore: false
        });
    });
});

