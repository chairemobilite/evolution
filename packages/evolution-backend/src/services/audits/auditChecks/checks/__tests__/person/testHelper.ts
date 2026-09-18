/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { AnswerStatus } from 'evolution-common/lib/services/baseObjects/attributeTypes/AnswerStatus';
import type { PersonAuditCheckContext } from '../../../AuditCheckContexts';

export const didTripsYes: AnswerStatus<boolean> = { status: 'answered', value: true };
export const didTripsNo: AnswerStatus<boolean> = { status: 'answered', value: false };
export const didTripsDontKnow: AnswerStatus<boolean> = { status: 'dont_know' };

export const createMockPerson = (overrides: Partial<Person> = {}, validUuid = uuidV4()) => {
    return {
        _uuid: validUuid,
        age: 30,
        ...overrides
    } as Person;
};

export const createContextWithPerson = (personOverrides: Partial<Person> = {}, validUuid = uuidV4()): PersonAuditCheckContext => {
    return {
        person: createMockPerson(personOverrides, validUuid),
        household: undefined,
        home: undefined,
        interview: { _uuid: uuidV4() } as unknown as Interview
    };
};
