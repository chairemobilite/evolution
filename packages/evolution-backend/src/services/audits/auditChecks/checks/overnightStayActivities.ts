/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Activity } from 'evolution-common/lib/services/odSurvey/types';

/** Usual and non-usual school activities. A school stay at a journey boundary is a separate warning. */
const schoolActivities: readonly Activity[] = ['schoolUsual', 'schoolNotUsual'];

/**
 * Activities the questionnaire can set as the first place of a journey: home, or the
 * `departurePlaceOther` choices that map to an activity (od_mtl and enquête nationale).
 */
const overnightStayActivities: readonly Activity[] = [
    'home',
    'otherParentHome',
    'secondaryHome',
    'visiting',
    'restaurant',
    'workUsual',
    'workNotUsual',
    'leisureTourism'
];

const isListedActivity = (activity: string | undefined, activities: readonly Activity[]): boolean =>
    activity !== undefined && (activities as readonly string[]).includes(activity);

/**
 * True when the activity may start or end a journey. A missing activity is not a mismatch.
 * @param activity Visited place activity
 */
const isOvernightStayActivity = (activity: string | undefined): boolean =>
    isListedActivity(activity, overnightStayActivities);

/**
 * True when the activity is a usual or non-usual school activity.
 * @param activity Visited place activity
 */
const isSchoolActivity = (activity: string | undefined): boolean => isListedActivity(activity, schoolActivities);

/**
 * True when the first or last visited place of one journey has an activity that should not bound the journey.
 * This is a warning, these activities are rare, but may occur.
 * @param journey Journey to audit
 * @param boundary First or last visited place
 */
export const hasIncompatibleBoundaryActivity = (journey: Journey, boundary: 'first' | 'last'): boolean => {
    const places = journey.visitedPlaces ?? [];
    const activity = (boundary === 'first' ? places[0] : places[places.length - 1])?.activity;
    return activity !== undefined && !isOvernightStayActivity(activity) && !isSchoolActivity(activity);
};

/**
 * True when the first or last visited place of one journey is a school activity.
 * @param journey Journey to audit
 * @param boundary First or last visited place
 */
export const hasSchoolBoundaryActivity = (journey: Journey, boundary: 'first' | 'last'): boolean => {
    const places = journey.visitedPlaces ?? [];
    const activity = (boundary === 'first' ? places[0] : places[places.length - 1])?.activity;
    return isSchoolActivity(activity);
};
