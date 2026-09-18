/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlaces } from './testHelper';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';

describe('VP_M_EndTime audit check', () => {
    const expectedError = (objectUuid: string) => ({
        objectType: 'visitedPlace',
        objectUuid,
        errorCode: 'VP_M_EndTime',
        version: 1,
        level: 'error',
        message: 'Visited place end time is missing',
        ignore: false
    });

    test.each([
        {
            description: 'last place has no end time',
            places: [{ _uuid: 'first', endTime: 28800 }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: false
        },
        {
            description: 'only place of the journey has no end time',
            places: [{ _uuid: 'only' }],
            auditedIndex: 0,
            shouldError: false
        },
        {
            description: 'first of two places has end time',
            places: [{ _uuid: 'first', endTime: 28800 }, { _uuid: 'last', startTime: 32400 }],
            auditedIndex: 0,
            shouldError: false
        },
        {
            description: 'first of two places end time is midnight',
            places: [{ _uuid: 'first', endTime: 0 }, { _uuid: 'last', startTime: 3600 }],
            auditedIndex: 0,
            shouldError: false
        },
        {
            description: 'first of two places has only an end time period',
            places: [{ _uuid: 'first', endTimePeriod: 'am' }, { _uuid: 'last' }],
            auditedIndex: 0,
            shouldError: false
        },
        {
            description: 'first of two places has no end time',
            places: [{ _uuid: 'first' }, { _uuid: 'last', startTime: 32400 }],
            auditedIndex: 0,
            shouldError: true
        },
        {
            description: 'middle place has no end time',
            places: [{ _uuid: 'first', endTime: 28800 }, { _uuid: 'middle', startTime: 32400 }, { _uuid: 'last' }],
            auditedIndex: 1,
            shouldError: true
        },
        {
            description: 'loop place is audited on its own end time',
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
        const result = visitedPlaceAuditChecks.VP_M_EndTime(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError(context.visitedPlace._uuid!));
        } else {
            expect(result).toBeUndefined();
        }
    });
});
