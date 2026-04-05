/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('HH_L_SizeMembersCountMismatch audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeMembers = (count: number) =>
        Array.from({ length: count }, () => new Person({ _uuid: uuidV4() }, surveyObjectsRegistry));

    it('should pass when household size matches members count', () => {
        const context = createContextWithHouseholdAndHome(
            { size: 3, members: makeMembers(3) },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        const result = householdAuditChecks.HH_L_SizeMembersCountMismatch(context);

        expect(result).toBeUndefined();
    });

    const mismatchCases: ReadonlyArray<[size: number, memberCount: number]> = [
        [1, 2],
        [2, 1],
        [5, 1]
    ];

    it.each(mismatchCases)(
        'should error when size is %i but members count is %i',
        (size, memberCount) => {
            const context = createContextWithHouseholdAndHome(
                { size, members: makeMembers(memberCount) },
                undefined,
                validHouseholdUuid,
                validHomeUuid
            );

            const result = householdAuditChecks.HH_L_SizeMembersCountMismatch(context);

            expect(result).toMatchObject({
                objectType: 'household',
                objectUuid: validHouseholdUuid,
                errorCode: 'HH_L_SizeMembersCountMismatch',
                version: 1,
                level: 'error',
                message: 'Size and members count mismatch',
                ignore: false
            });
        }
    );

    it('should return undefined when size is undefined', () => {
        const context = createContextWithHouseholdAndHome(
            { size: undefined, members: makeMembers(2) },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        expect(householdAuditChecks.HH_L_SizeMembersCountMismatch(context)).toBeUndefined();
    });

    it('should return undefined when members is undefined', () => {
        const context = createContextWithHouseholdAndHome(
            { size: 3, members: undefined },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        expect(householdAuditChecks.HH_L_SizeMembersCountMismatch(context)).toBeUndefined();
    });
});
