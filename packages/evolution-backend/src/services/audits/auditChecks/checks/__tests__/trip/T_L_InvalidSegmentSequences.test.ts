/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { tripAuditChecks } from '../../TripAuditChecks';
import { createContextWithTrip } from './testHelper';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

describe('T_L_InvalidSegmentSequences audit check', () => {
    const validTripUuid = uuidV4();
    const surveyObjectsRegistry = new SurveyObjectsRegistry();

    const makeContext = (sequences: (number | undefined)[] | undefined) =>
        createContextWithTrip(
            {
                segments: sequences?.map(
                    (sequence) =>
                        new Segment({ _uuid: uuidV4(), _sequence: sequence, mode: 'walk' }, surveyObjectsRegistry)
                )
            },
            validTripUuid
        );

    it.each([
        ['contiguous sequences 1..3', [1, 2, 3], false],
        ['single segment with sequence 1', [1], false],
        ['unsorted but valid and unique', [3, 1, 2], false],
        // Multimode trips legitimately have holes after the walking segments are filtered
        // out, so gaps are not audited for segments
        ['gap left by walking segment filtering', [2], false],
        ['gap in sequences', [1, 3], false],
        ['duplicate sequences', [1, 1], true],
        ['missing sequence', [undefined], true],
        ['invalid zero sequence', [0], true],
        ['mixed valid and missing sequence', [1, undefined], true],
        ['no segments', undefined, false],
        ['empty segments', [], false]
    ])('%s: %p -> %p', (_title, sequences, shouldError) => {
        const result = tripAuditChecks.T_L_InvalidSegmentSequences(makeContext(sequences));

        if (shouldError) {
            expect(result).toMatchObject({
                objectType: 'trip',
                objectUuid: validTripUuid,
                errorCode: 'T_L_InvalidSegmentSequences',
                version: 1,
                level: 'error',
                message: 'At least one segment sequence is invalid or duplicated',
                ignore: false
            });
        } else {
            expect(result).toBeUndefined();
        }
    });
});
