/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlace } from './testHelper';

const minutes = (count: number) => count * 60;

describe('VP_W_ActivityLessThan30MinDurationPossibleMismatch audit check', () => {
    const validUuid = uuidV4();

    const expectedWarning = {
        objectType: 'visitedPlace',
        objectUuid: validUuid,
        errorCode: 'VP_W_ActivityLessThan30MinDurationPossibleMismatch',
        version: 2,
        level: 'warning',
        message: 'Activity duration < 30 minutes for a usual place',
        ignore: false
    };

    test.each([
        { description: 'home stay under 30 minutes', activity: 'home', startTime: 0, endTime: minutes(29), shouldWarn: false },
        { description: 'usual work stay under 30 minutes', activity: 'workUsual', startTime: 8 * 3600, endTime: 8 * 3600 + minutes(10), shouldWarn: true },
        { description: 'usual school stay under 30 minutes', activity: 'schoolUsual', startTime: 0, endTime: minutes(1), shouldWarn: true },
        { description: 'home stay of exactly 30 minutes', activity: 'home', startTime: 0, endTime: minutes(30), shouldWarn: false },
        { description: 'usual work stay over 30 minutes', activity: 'workUsual', startTime: 0, endTime: minutes(31), shouldWarn: false },
        { description: 'other activity under 30 minutes', activity: 'shopping', startTime: 0, endTime: minutes(10), shouldWarn: false },
        { description: 'home stay with no times', activity: 'home', startTime: undefined, endTime: undefined, shouldWarn: false },
        { description: 'short stay with no activity', activity: undefined, startTime: 0, endTime: minutes(10), shouldWarn: false }
    ])('$description', ({ activity, startTime, endTime, shouldWarn }) => {
        const context = createContextWithVisitedPlace({ activity, startTime, endTime }, validUuid);
        const result = visitedPlaceAuditChecks.VP_W_ActivityLessThan30MinDurationPossibleMismatch(context);

        if (shouldWarn) {
            expect(result).toEqual(expectedWarning);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
