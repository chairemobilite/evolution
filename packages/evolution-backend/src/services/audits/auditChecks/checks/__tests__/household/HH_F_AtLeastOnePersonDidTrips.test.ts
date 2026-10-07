/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { AnswerStatus } from 'evolution-common/lib/services/baseObjects/attributeTypes/AnswerStatus';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';

const answered = (value: boolean): AnswerStatus<boolean> => ({ status: 'answered', value });

const member = (journeys: Array<AnswerStatus<boolean> | undefined> | undefined): Person =>
    ({
        _uuid: uuidV4(),
        journeys:
            journeys === undefined ? undefined : journeys.map((didTrips) => ({ _uuid: uuidV4(), didTrips }) as Journey)
    }) as Person;

describe('HH_F_AtLeastOnePersonDidTrips audit check', () => {
    const householdUuid = uuidV4();

    const expectedInfoAudit = {
        objectType: 'household',
        objectUuid: householdUuid,
        errorCode: 'HH_F_AtLeastOnePersonDidTrips',
        version: 1,
        level: 'info',
        message: 'At least one household member did trips',
        ignore: false
    };

    const runCheck = (members: Person[] | undefined) =>
        householdAuditChecks.HH_F_AtLeastOnePersonDidTrips(
            createContextWithHouseholdAndHome({ members }, undefined, householdUuid)
        );

    test.each([
        {
            description: 'one member answered yes',
            members: [member([answered(true)])],
            expected: expectedInfoAudit
        },
        {
            description: 'yes on a later journey',
            members: [member([answered(false), answered(true)])],
            expected: expectedInfoAudit
        },
        {
            description: 'yes among members who answered no',
            members: [member([answered(false)]), member([answered(true)])],
            expected: expectedInfoAudit
        },
        {
            description: 'every member answered no',
            members: [member([answered(false)])],
            expected: undefined
        },
        {
            description: 'dont know',
            members: [member([{ status: 'dont_know' }])],
            expected: undefined
        },
        {
            description: 'not applicable',
            members: [member([{ status: 'not_applicable' }])],
            expected: undefined
        },
        {
            description: 'didTrips was never answered',
            members: [member([undefined])],
            expected: undefined
        },
        {
            description: 'a member has no journeys',
            members: [member(undefined)],
            expected: undefined
        },
        {
            description: 'the household has no members',
            members: [],
            expected: undefined
        },
        {
            description: 'members are missing',
            members: undefined,
            expected: undefined
        }
    ])('$description', ({ members, expected }) => {
        expect(runCheck(members)).toEqual(expected);
    });
});
