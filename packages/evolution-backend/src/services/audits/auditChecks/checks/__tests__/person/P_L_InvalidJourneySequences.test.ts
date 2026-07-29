/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { personAuditChecks } from '../../PersonAuditChecks';
import { createContextWithPerson } from './testHelper';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('person journey sequence audit checks', () => {
    const validPersonUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeContext = (sequences: (number | undefined)[] | undefined) =>
        createContextWithPerson(
            {
                journeys: sequences?.map(
                    (sequence) => new Journey({ _uuid: uuidV4(), _sequence: sequence }, surveyObjectsRegistry)
                )
            },
            validPersonUuid
        );

    describe('P_L_InvalidJourneySequences', () => {
        it.each([
            ['contiguous sequences 1..3', [1, 2, 3], false],
            ['single journey with sequence 1', [1], false],
            ['unsorted but valid and unique', [3, 1, 2], false],
            ['gap in sequences is a warning, not an error', [1, 3], false],
            ['duplicate sequences', [1, 1], true],
            ['missing sequence', [undefined], true],
            ['invalid zero sequence', [0], true],
            ['mixed valid and missing sequence', [1, undefined], true],
            ['no journeys', undefined, false],
            ['empty journeys', [], false]
        ])('%s: %p -> %p', (_title, sequences, shouldError) => {
            const result = personAuditChecks.P_L_InvalidJourneySequences(makeContext(sequences));

            if (shouldError) {
                expect(result).toMatchObject({
                    objectType: 'person',
                    objectUuid: validPersonUuid,
                    errorCode: 'P_L_InvalidJourneySequences',
                    version: 1,
                    level: 'error',
                    message: 'At least one journey sequence is invalid or duplicated',
                    ignore: false
                });
            } else {
                expect(result).toBeUndefined();
            }
        });
    });
});
