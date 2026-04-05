/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Optional } from 'evolution-common/lib/types/Optional.type';
import type { Household } from 'evolution-common/lib/services/baseObjects/Household';
import type { Home } from 'evolution-common/lib/services/baseObjects/Home';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { HouseholdAuditCheckContext } from '../../../AuditCheckContexts';
import { createMockHome } from '../home/testHelper';

export const createMockHousehold = (overrides: Partial<Household> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        size: 3,
        ...overrides
    } as Household;
};

export const createContextWithHouseholdAndHome = (householdOverrides: Partial<Household> = {}, homeOverrides: Optional<Partial<Home>> = undefined, validHouseholdUuid = uuidV4(), validHomeUuid = uuidV4()): HouseholdAuditCheckContext => {
    return {
        household: createMockHousehold(householdOverrides, validHouseholdUuid),
        home: homeOverrides ? createMockHome(homeOverrides, validHomeUuid) : undefined,
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};
