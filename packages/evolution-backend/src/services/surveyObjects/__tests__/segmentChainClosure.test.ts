/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    computeIsSegmentChainClosed,
    computeIsSegmentChainClosedMoreThanOnce
} from '../derivedFlags/segmentChainClosure';
import type { ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';

type ClosureCase = {
    description: string;
    segments?: { [uuid: string]: ExtendedSegmentAttributes };
            isClosed: boolean;
            isClosedMoreThanOnce: boolean;
};

describe('segment chain closure', () => {
    test.each<ClosureCase>([
        {
            description: 'no segments map',
            segments: undefined,
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'empty segments map',
            segments: {},
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'segments without hasNextMode',
            segments: { a: { _sequence: 1 }, b: { _sequence: 2 } },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'single segment closes the chain',
            segments: { a: { _sequence: 1, hasNextMode: false } },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last segment closes the chain',
            segments: {
                a: { _sequence: 1, hasNextMode: true },
                b: { _sequence: 2, hasNextMode: false }
            },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last segment says another mode followed',
            segments: { a: { _sequence: 1, hasNextMode: true } },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last segment unanswered, earlier segment answered',
            segments: {
                a: { _sequence: 1, hasNextMode: false },
                b: { _sequence: 2 }
            },
            isClosed: false,
            isClosedMoreThanOnce: false
        },
        {
            description: 'middle segment unanswered, last segment closes',
            segments: {
                a: { _sequence: 1, hasNextMode: true },
                b: { _sequence: 2 },
                c: { _sequence: 3, hasNextMode: false }
            },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'last segment by sequence, not insertion order',
            segments: {
                later: { _sequence: 2, hasNextMode: false },
                first: { _sequence: 1, hasNextMode: true }
            },
            isClosed: true,
            isClosedMoreThanOnce: false
        },
        {
            description: 'more than one segment closes the chain',
            segments: {
                a: { _sequence: 1, hasNextMode: false },
                b: { _sequence: 2, hasNextMode: false }
            },
            isClosed: true,
            isClosedMoreThanOnce: true
        }
    ])('$description', ({ segments, isClosed, isClosedMoreThanOnce }) => {
        expect(computeIsSegmentChainClosed(segments)).toBe(isClosed);
        expect(computeIsSegmentChainClosedMoreThanOnce(segments)).toBe(isClosedMoreThanOnce);
    });
});
