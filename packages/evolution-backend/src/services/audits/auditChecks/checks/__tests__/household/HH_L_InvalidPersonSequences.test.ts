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

describe('household person sequence audit checks', () => {
    const validHouseholdUuid = uuidV4();
    const validHomeUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeContext = (sequences: (number | undefined)[] | undefined) =>
        createContextWithHouseholdAndHome(
            {
                members: sequences?.map(
                    (sequence) => new Person({ _uuid: uuidV4(), _sequence: sequence }, surveyObjectsRegistry)
                )
            },
            undefined,
            validHouseholdUuid,
            validHomeUuid
        );

    describe('HH_L_InvalidPersonSequences', () => {
        it.each([
            ['contiguous sequences 1..3', [1, 2, 3], false],
            ['single person with sequence 1', [1], false],
            ['unsorted but valid and unique', [3, 1, 2], false],
            ['gap in sequences is a warning, not an error', [1, 3], false],
            ['sequences not starting at 1 is a warning, not an error', [2, 3], false],
            ['duplicate sequences', [1, 1], true],
            ['duplicate sequences at 2', [2, 2], true],
            ['missing sequence', [undefined], true],
            ['invalid zero sequence', [0], true],
            ['mixed valid and missing sequence', [1, undefined], true],
            ['no members', undefined, false],
            ['empty members', [], false]
        ])('%s: %p -> %p', (_title, sequences, shouldError) => {
            const result = householdAuditChecks.HH_L_InvalidPersonSequences(makeContext(sequences));

            if (shouldError) {
                expect(result).toMatchObject({
                    objectType: 'household',
                    objectUuid: validHouseholdUuid,
                    errorCode: 'HH_L_InvalidPersonSequences',
                    version: 1,
                    level: 'error',
                    message: 'At least one person sequence is invalid or duplicated',
                    ignore: false
                });
            } else {
                expect(result).toBeUndefined();
            }
        });
    });

    describe('HH_W_PersonSequenceGaps', () => {
        it.each([
            ['contiguous sequences 1..3', [1, 2, 3], false],
            ['single person with sequence 1', [1], false],
            ['unsorted but contiguous', [3, 1, 2], false],
            ['gap in sequences', [1, 3], true],
            ['sequences not starting at 1', [2, 3], true],
            // Invalid and duplicate sequences are reported by HH_L_InvalidPersonSequences
            ['duplicate sequences', [1, 1], false],
            ['missing sequence', [1, undefined], false],
            ['no members', undefined, false],
            ['empty members', [], false]
        ])('%s: %p -> %p', (_title, sequences, shouldWarn) => {
            const result = householdAuditChecks.HH_W_PersonSequenceGaps(makeContext(sequences));

            if (shouldWarn) {
                expect(result).toMatchObject({
                    objectType: 'household',
                    objectUuid: validHouseholdUuid,
                    errorCode: 'HH_W_PersonSequenceGaps',
                    version: 1,
                    level: 'warning',
                    message: 'Person sequences are not contiguous',
                    ignore: false
                });
            } else {
                expect(result).toBeUndefined();
            }
        });
    });
});
