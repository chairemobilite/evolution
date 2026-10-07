/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';

const journeyUuid = uuidV4();

const warning = {
    objectType: 'journey',
    objectUuid: journeyUuid,
    errorCode: 'J_W_JourneyNonHomeDeparturePlaceTypeIsInconsistent',
    version: 1,
    level: 'warning',
    message: 'Departure place type is inconsistent with the first place',
    ignore: false
};

const place = (activity: string | undefined): VisitedPlace[] => [{ activity } as VisitedPlace];

describe('J_W_JourneyNonHomeDeparturePlaceTypeIsInconsistent', () => {
    test.each([
        { description: 'first place is home: accepted', activity: 'home', departurePlaceOther: undefined, expected: undefined },
        { description: 'missing activity: accepted', activity: undefined, departurePlaceOther: undefined, expected: undefined },
        { description: 'no visited place: accepted', activity: undefined, omitPlaces: true, departurePlaceOther: 'sleptAtFriends', expected: undefined },
        { description: 'sleptAtFriends and visiting: accepted', activity: 'visiting', departurePlaceOther: 'sleptAtFriends', expected: undefined },
        { description: 'restaurant: accepted', activity: 'restaurant', departurePlaceOther: 'restaurant', expected: undefined },
        { description: 'otherParentHome: accepted', activity: 'otherParentHome', departurePlaceOther: 'otherParentHome', expected: undefined },
        { description: 'secondaryHome: accepted', activity: 'secondaryHome', departurePlaceOther: 'secondaryHome', expected: undefined },
        { description: 'hotelForWork: accepted', activity: 'workNotUsual', departurePlaceOther: 'hotelForWork', expected: undefined },
        { description: 'hotelForVacation: accepted', activity: 'leisureTourism', departurePlaceOther: 'hotelForVacation', expected: undefined },
        { description: 'studying and schoolUsual: accepted', activity: 'schoolUsual', departurePlaceOther: 'studying', expected: undefined },
        { description: 'studying and schoolNotUsual: accepted', activity: 'schoolNotUsual', departurePlaceOther: 'studying', expected: undefined },
        { description: 'workedOvernight and workUsual: accepted', activity: 'workUsual', departurePlaceOther: 'workedOvernight', expected: undefined },
        { description: 'workedOvernight and workNotUsual: accepted', activity: 'workNotUsual', departurePlaceOther: 'workedOvernight', expected: undefined },
        { description: 'workedOvernight and workOnTheRoad: accepted', activity: 'workOnTheRoad', departurePlaceOther: 'workedOvernight', expected: undefined },
        { description: 'shopping with sleptAtFriends: warning', activity: 'shopping', departurePlaceOther: 'sleptAtFriends', expected: warning },
        { description: 'shopping with no departure type: warning', activity: 'shopping', departurePlaceOther: undefined, expected: warning },
        { description: 'schoolUsual with workedOvernight: warning', activity: 'schoolUsual', departurePlaceOther: 'workedOvernight', expected: warning },
        { description: 'unknown departure type: warning', activity: 'visiting', departurePlaceOther: 'unknownValue', expected: warning }
    ])('$description', ({ activity, departurePlaceOther, omitPlaces, expected }) => {
        const result = journeyAuditChecks.J_W_JourneyNonHomeDeparturePlaceTypeIsInconsistent(
            createContextWithJourney(
                {
                    visitedPlaces: omitPlaces ? undefined : place(activity),
                    _originalDeparturePlaceOther: departurePlaceOther
                },
                journeyUuid
            )
        );
        expect(result).toEqual(expected);
    });
});
