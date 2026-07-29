/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('journey trip sequence audit checks', () => {
    const validJourneyUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeContext = (sequences: (number | undefined)[] | undefined) =>
        createContextWithJourney(
            {
                trips: sequences?.map(
                    (sequence) => new Trip({ _uuid: uuidV4(), _sequence: sequence }, surveyObjectsRegistry)
                )
            },
            validJourneyUuid
        );

    describe('J_L_InvalidTripSequences', () => {
        it.each([
            ['contiguous sequences 1..3', [1, 2, 3], false],
            ['single trip with sequence 1', [1], false],
            ['unsorted but valid and unique', [3, 1, 2], false],
            ['gap in sequences is a warning, not an error', [1, 3], false],
            ['duplicate sequences', [1, 1], true],
            ['missing sequence', [undefined], true],
            ['invalid zero sequence', [0], true],
            ['mixed valid and missing sequence', [1, undefined], true],
            ['no trips', undefined, false],
            ['empty trips', [], false]
        ])('%s: %p -> %p', (_title, sequences, shouldError) => {
            const result = journeyAuditChecks.J_L_InvalidTripSequences(makeContext(sequences));

            if (shouldError) {
                expect(result).toMatchObject({
                    objectType: 'journey',
                    objectUuid: validJourneyUuid,
                    errorCode: 'J_L_InvalidTripSequences',
                    version: 1,
                    level: 'error',
                    message: 'At least one trip sequence is invalid or duplicated',
                    ignore: false
                });
            } else {
                expect(result).toBeUndefined();
            }
        });
    });
});
