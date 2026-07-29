/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('journey visited place sequence audit checks', () => {
    const validJourneyUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeContext = (sequences: (number | undefined)[] | undefined) =>
        createContextWithJourney(
            {
                visitedPlaces: sequences?.map(
                    (sequence) => new VisitedPlace({ _uuid: uuidV4(), _sequence: sequence }, surveyObjectsRegistry)
                )
            },
            validJourneyUuid
        );

    describe('J_L_InvalidVisitedPlaceSequences', () => {
        it.each([
            ['contiguous sequences 1..3', [1, 2, 3], false],
            ['single visited place with sequence 1', [1], false],
            ['unsorted but valid and unique', [3, 1, 2], false],
            ['gap in sequences is a warning, not an error', [1, 3], false],
            ['duplicate sequences', [1, 1], true],
            ['missing sequence', [undefined], true],
            ['invalid zero sequence', [0], true],
            ['mixed valid and missing sequence', [1, undefined], true],
            ['no visited places', undefined, false],
            ['empty visited places', [], false]
        ])('%s: %p -> %p', (_title, sequences, shouldError) => {
            const result = journeyAuditChecks.J_L_InvalidVisitedPlaceSequences(makeContext(sequences));

            if (shouldError) {
                expect(result).toMatchObject({
                    objectType: 'journey',
                    objectUuid: validJourneyUuid,
                    errorCode: 'J_L_InvalidVisitedPlaceSequences',
                    version: 1,
                    level: 'error',
                    message: 'At least one visited place sequence is invalid or duplicated',
                    ignore: false
                });
            } else {
                expect(result).toBeUndefined();
            }
        });
    });

    describe('J_W_VisitedPlaceSequenceGaps', () => {
        it.each([
            ['contiguous sequences 1..3', [1, 2, 3], false],
            ['single visited place with sequence 1', [1], false],
            ['unsorted but contiguous', [3, 1, 2], false],
            ['gap in sequences', [1, 3], true],
            ['sequences not starting at 1', [2, 3], true],
            // Invalid and duplicate sequences are reported by J_L_InvalidVisitedPlaceSequences
            ['duplicate sequences', [1, 1], false],
            ['missing sequence', [1, undefined], false],
            ['no visited places', undefined, false],
            ['empty visited places', [], false]
        ])('%s: %p -> %p', (_title, sequences, shouldWarn) => {
            const result = journeyAuditChecks.J_W_VisitedPlaceSequenceGaps(makeContext(sequences));

            if (shouldWarn) {
                expect(result).toMatchObject({
                    objectType: 'journey',
                    objectUuid: validJourneyUuid,
                    errorCode: 'J_W_VisitedPlaceSequenceGaps',
                    version: 1,
                    level: 'warning',
                    message: 'Visited place sequences are not contiguous',
                    ignore: false
                });
            } else {
                expect(result).toBeUndefined();
            }
        });
    });
});
