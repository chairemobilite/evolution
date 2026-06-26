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

describe('HH_L_InvalidPersonSequences audit check', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeMember = (sequence: number | undefined) =>
        new Person({ _uuid: uuidV4(), _sequence: sequence }, surveyObjectsRegistry);

    /** Build members as PersonFactory would after sorting by _sequence */
    const makeMembersAfterFactory = (sequences: (number | undefined)[]) =>
        [...sequences]
            .sort((a, b) => (a ?? 0) - (b ?? 0))
            .map((sequence) => makeMember(sequence));

    // [title, sequences, shouldError, simulateFactorySort]
    const cases: [string, (number | undefined)[], boolean, boolean][] = [
        ['valid sequences 1..3', [1, 2, 3], false, true],
        ['single person with sequence 1', [1], false, true],
        ['members not sorted by sequence', [3, 1, 2], true, false],
        ['gap in sequences', [1, 3], true, true],
        ['sequences not starting at 1', [2, 3], true, true],
        ['duplicate sequences', [1, 1], true, true],
        ['missing sequence', [undefined], true, true],
        ['mixed valid and missing sequence', [1, undefined], true, true]
    ];

    it.each(cases)('%s', (_title, sequences, shouldError, simulateFactorySort) => {
        const members = simulateFactorySort ? makeMembersAfterFactory(sequences) : sequences.map((s) => makeMember(s));
        const context = createContextWithHouseholdAndHome(
            { members },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        const result = householdAuditChecks.HH_L_InvalidPersonSequences(context);

        if (shouldError) {
            expect(result).toMatchObject({
                objectType: 'household',
                objectUuid: validHouseholdUuid,
                errorCode: 'HH_L_InvalidPersonSequences',
                version: 1,
                level: 'error',
                message: 'At least one person sequence is invalid',
                ignore: false
            });
        } else {
            expect(result).toBeUndefined();
        }
    });

    it('should pass when members is undefined', () => {
        const context = createContextWithHouseholdAndHome(
            { members: undefined },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        expect(householdAuditChecks.HH_L_InvalidPersonSequences(context)).toBeUndefined();
    });

    it('should pass when members is empty', () => {
        const context = createContextWithHouseholdAndHome(
            { members: [] },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

        expect(householdAuditChecks.HH_L_InvalidPersonSequences(context)).toBeUndefined();
    });
});
