/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { VisitedPlaceAuditCheckContext } from '../../../AuditCheckContexts';

export const createMockVisitedPlace = (overrides: Partial<VisitedPlace> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        activity: 'work',
        geography: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point' as const,
                coordinates: [-73.5, 45.5]
            }
        },
        ...overrides
    } as VisitedPlace;
};

export const createContextWithVisitedPlace = (visitedPlaceOverrides: Partial<VisitedPlace> = {}, validUuid = uuidV4()): VisitedPlaceAuditCheckContext => {
    return {
        visitedPlace: createMockVisitedPlace(visitedPlaceOverrides, validUuid),
        person: { _uuid: uuidV4() } as unknown as Person,
        journey: { _uuid: uuidV4() } as unknown as Journey,
        household: undefined,
        home: undefined,
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};
