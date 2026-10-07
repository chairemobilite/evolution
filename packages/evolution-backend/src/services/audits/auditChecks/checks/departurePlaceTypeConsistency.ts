/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Activity } from 'evolution-common/lib/services/odSurvey/types';

/**
 * Activities a `departurePlaceOther` choice may produce as the first visited place.
 * `studying` and `workedOvernight` leave the activity for the respondent to choose
 * inside the school or work category.
 */
const activitiesByDeparturePlaceOther: { [choice: string]: readonly Activity[] } = {
    otherParentHome: ['otherParentHome'],
    restaurant: ['restaurant'],
    secondaryHome: ['secondaryHome'],
    sleptAtFriends: ['visiting'],
    hotelForWork: ['workNotUsual'],
    hotelForVacation: ['leisureTourism'],
    studying: ['schoolUsual', 'schoolNotUsual'],
    workedOvernight: ['workUsual', 'workNotUsual', 'workOnTheRoad']
};

/**
 * First-place activity this audit compares to `departurePlaceOther`.
 * `home` and a missing activity are ignored.
 * @param journey Journey whose visited places are ordered by sequence
 * @returns The activity, or `undefined` when the check does not apply
 */
const firstPlaceActivityToCompare = (journey: Journey): string | undefined => {
    const activity = journey.visitedPlaces?.[0]?.activity;
    if (_isBlank(activity) || activity === 'home') {
        return undefined;
    }
    return activity;
};

/**
 * True when the first place is neither home nor missing an activity, and the
 * questionnaire `departurePlaceOther` is missing or does not match that activity.
 * `Journey` stores that questionnaire field as `_originalDeparturePlaceOther`.
 * @param journey Journey built from the questionnaire response
 * @returns Whether `J_W_JourneyNonHomeDeparturePlaceTypeIsInconsistent` applies
 */
export const departurePlaceTypeIsInconsistent = (journey: Journey): boolean => {
    const activity = firstPlaceActivityToCompare(journey);
    if (activity === undefined) {
        return false;
    }
    const departurePlaceOther = journey._originalDeparturePlaceOther;
    if (typeof departurePlaceOther !== 'string' || _isBlank(departurePlaceOther)) {
        return true;
    }
    const accepted = activitiesByDeparturePlaceOther[departurePlaceOther];
    return accepted === undefined || !(accepted as readonly string[]).includes(activity);
};
