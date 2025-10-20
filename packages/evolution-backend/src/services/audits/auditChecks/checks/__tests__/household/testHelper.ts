/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Household } from 'evolution-common/lib/services/baseObjects/Household';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { HouseholdAuditCheckContext } from '../../../AuditCheckContexts';

export const createMockHousehold = (overrides: Partial<Household> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        size: 3,
        ...overrides
    } as Household;
};

export const createContextWithHousehold = (householdOverrides: Partial<Household> = {}, validUuid = uuidV4()): HouseholdAuditCheckContext => {
    return {
        household: createMockHousehold(householdOverrides, validUuid),
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};
