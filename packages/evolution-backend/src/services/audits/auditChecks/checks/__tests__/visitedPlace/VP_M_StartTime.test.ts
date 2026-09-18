/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlaces } from './testHelper';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';

describe('VP_M_StartTime audit check', () => {
    const expectedError = (objectUuid: string) => ({
        objectType: 'visitedPlace',
        objectUuid,
        errorCode: 'VP_M_StartTime',
        version: 1,
        level: 'error',
        message: 'Visited place start time is missing',
        ignore: false
    });

    test.each([
        {
            description: 'first place has no start time',
            places: [{ _uuid: 'first' }, { _uuid: 'second', startTime: 36000 }],
            auditedIndex: 0,
            shouldError: false
        },
        {
            description: 'only place of the journey has no start time',
            places: [{ _uuid: 'only' }],
            auditedIndex: 0,
            shouldError: false
        },
        {
            description: 'middle place has start time',
            places: [{ _uuid: 'first', endTime: 28800 }, { _uuid: 'middle', startTime: 32400 }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: false
        },
        {
            description: 'middle place start time is midnight',
            places: [{ _uuid: 'first', endTime: 82800 }, { _uuid: 'middle', startTime: 0 }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: false
        },
        {
            description: 'middle place has only a start time period',
            places: [{ _uuid: 'first' }, { _uuid: 'middle', startTimePeriod: 'am' }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: false
        },
        {
            description: 'middle place has no start time',
            places: [{ _uuid: 'first', endTime: 28800 }, { _uuid: 'middle' }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: true
        },
        {
            description: 'last of two places has no start time',
            places: [{ _uuid: 'first', endTime: 28800 }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: true
        },
        {
            description: 'loop place is audited on its own start time',
            places: [
                { _uuid: 'first', endTime: 28800 },
                { _uuid: 'loop', activity: 'workOnTheRoad', startTime: 28800, endTime: 36000 },
                { _uuid: 'last', startTime: 36000 }
            ],
            auditedIndex: 1,
            shouldError: false
        }
    ])('$description', ({ places, auditedIndex, shouldError }) => {
        const context = createContextWithVisitedPlaces(places as Partial<VisitedPlace>[], auditedIndex);
        const result = visitedPlaceAuditChecks.VP_M_StartTime(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError(context.visitedPlace._uuid!));
        } else {
            expect(result).toBeUndefined();
        }
    });
});
