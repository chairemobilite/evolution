/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { compareSequenceThenUuid, hasInvalidOrDuplicateSequences, hasSequenceGaps } from '../sequenceUtils';

describe('sequenceUtils', () => {
    const makeItems = (sequences: (number | undefined)[]) =>
        sequences.map((sequence) => ({ attributes: { _sequence: sequence, foo: 'bar' } }));

    describe('compareSequenceThenUuid', () => {
        it('should sort by sequence then UUID', () => {
            const entries: [string, { _sequence?: number }][] = [
                ['uuid-b', { _sequence: 2 }],
                ['uuid-a', { _sequence: 2 }],
                ['uuid-c', { _sequence: 1 }]
            ];

            expect([...entries].sort(compareSequenceThenUuid)).toEqual([
                ['uuid-c', { _sequence: 1 }],
                ['uuid-a', { _sequence: 2 }],
                ['uuid-b', { _sequence: 2 }]
            ]);
        });

        it('should sort missing sequences first, then by UUID', () => {
            const entries: [string, { _sequence?: number }][] = [
                ['uuid-b', { _sequence: 1 }],
                ['uuid-c', {}],
                ['uuid-a', {}]
            ];

            expect([...entries].sort(compareSequenceThenUuid).map(([uuid]) => uuid)).toEqual([
                'uuid-a',
                'uuid-c',
                'uuid-b'
            ]);
        });
    });

    describe('hasInvalidOrDuplicateSequences', () => {
        it.each([
            ['contiguous sequences', [1, 2, 3], false],
            ['single sequence', [1], false],
            ['gap in sequences', [1, 2, 3, 5, 6], false],
            ['not starting at 1', [2, 3], false],
            ['unsorted but valid and unique', [3, 1, 2], false],
            ['duplicate sequences', [1, 1], true],
            ['duplicate among valid values', [1, 2, 2, 3], true],
            ['missing sequence', [undefined], true],
            ['missing sequence among valid values', [1, undefined, 3], true],
            ['zero sequence', [0], true],
            ['negative sequence', [-1, 1], true],
            ['non-integer sequence', [1, 2.5], true],
            ['NaN sequence', [1, NaN], true]
        ])('%s: %p -> %p', (_title, sequences, expected) => {
            expect(hasInvalidOrDuplicateSequences(makeItems(sequences))).toBe(expected);
        });

        it.each([
            ['undefined items', undefined],
            ['empty items', []]
        ])('%s -> false', (_title, items) => {
            expect(hasInvalidOrDuplicateSequences(items)).toBe(false);
        });
    });

    describe('hasSequenceGaps', () => {
        it.each([
            ['contiguous sequences', [1, 2, 3], false],
            ['single sequence', [1], false],
            ['unsorted but contiguous', [3, 1, 2], false],
            ['gap in sequences', [1, 2, 3, 5, 6], true],
            ['single gap', [1, 3], true],
            ['not starting at 1', [2, 3], true],
            ['single sequence not starting at 1', [2], true],
            // Invalid and duplicate values are reported by hasInvalidOrDuplicateSequences,
            // so they must not also raise a gap warning
            ['duplicate sequences', [1, 1], false],
            ['missing sequence', [1, undefined], false],
            ['zero sequence', [0, 1], false]
        ])('%s: %p -> %p', (_title, sequences, expected) => {
            expect(hasSequenceGaps(makeItems(sequences))).toBe(expected);
        });

        it.each([
            ['undefined items', undefined],
            ['empty items', []]
        ])('%s -> false', (_title, items) => {
            expect(hasSequenceGaps(items)).toBe(false);
        });
    });
});
