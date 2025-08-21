/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Activity, ActivityCategory } from '../../../baseObjects/attributeTypes/VisitedPlaceAttributes';

/**
 * Maps activities and activity categories to their corresponding icon paths
 * This mapping associates each activity with an appropriate icon in the /dist/icons/activities/ directory
 */
const activityToIconPathMapping: Record<ActivityCategory | Activity | 'default', string> = {
    // FIXME Theses activities are the ones used in the visited places section
    // of the od_nationale_quebec survey. This may not be the complete list of
    // activities.

    // Home activities
    home: '/dist/icons/activities/home/home',
    otherParentHome: '/dist/icons/activities/home/home_secondary',
    visiting: '/dist/icons/activities/other/two_persons',
    secondaryHome: '/dist/icons/activities/home/home_secondary',

    // Work/school related activities
    work: '/dist/icons/activities/work/briefcase',
    school: '/dist/icons/activities/school/graduation_cap',
    workUsual: '/dist/icons/activities/work/briefcase',
    workNotUsual: '/dist/icons/activities/work/worker_with_necktie',
    workOnTheRoad: '/dist/icons/activities/work/truck',
    schoolUsual: '/dist/icons/activities/school/graduation_cap',
    schoolNotUsual: '/dist/icons/activities/school/school_building_large',
    schoolNotStudent: '/dist/icons/activities/school/school_building_large',

    // Service and leisure activities
    shoppingServiceRestaurant: '/dist/icons/activities/shopping/shopping_cart',
    leisure: '/dist/icons/activities/leisure/music',
    shopping: '/dist/icons/activities/shopping/shopping_cart',
    restaurant: '/dist/icons/activities/other/restaurant',
    service: '/dist/icons/activities/services/bank',
    // FIXME Validate this icon, it's too sportsy
    leisureStroll: '/dist/icons/activities/leisure/sports_run',
    leisureSports: '/dist/icons/activities/leisure/sports_run',
    leisureArtsMusicCulture: '/dist/icons/activities/leisure/music',
    leisureTourism: '/dist/icons/activities/leisure/luggages',
    medical: '/dist/icons/activities/other/medical_cross',
    veterinarian: '/dist/icons/activities/services/cat_dog',

    // Various activities
    dropFetchSomeone: '/dist/icons/activities/accompany_drop_fetch_someone/drop_fetch_someone',
    dropSomeone: '/dist/icons/activities/accompany_drop_fetch_someone/drop_someone',
    fetchSomeone: '/dist/icons/activities/accompany_drop_fetch_someone/fetch_someone',
    accompanySomeone: '/dist/icons/activities/accompany_drop_fetch_someone/accompany_someone',
    worship: '/dist/icons/activities/other/worship',
    volunteering: '/dist/icons/activities/other/volunteering',
    carElectricChargingStation: '/dist/icons/activities/other/electric_charging_station',
    carsharingStation: '/dist/icons/activities/other/carsharing_station',
    pickClassifiedPurchase: '/dist/icons/activities/shopping/shopping_basket_with_home',

    // Other options
    other: '/dist/icons/activities/other/question_mark',
    dontKnow: '/dist/icons/activities/other/question_mark',
    preferNotToAnswer: '/dist/icons/activities/other/question_mark',
    default: '/dist/icons/activities/other/question_mark'
};

const resolveIconBasePath = (activity: ActivityCategory | Activity | null | undefined): string => {
    const key = activity ?? 'default';
    return activityToIconPathMapping[key] ?? activityToIconPathMapping.default;
};

/**
 * Returns the appropriate icon path for a given activity or activity category
 * @param activity The activity or activity category for which to get the icon
 * @returns The path to the icon for the activity
 */
export const getActivityIcon = (activity: ActivityCategory | Activity | null | undefined): string => {
    return `${resolveIconBasePath(activity)}.svg`;
};

type MarkerType = 'round' | 'square';
/**
 * Returns the appropriate icon path for the map marker corresponding to a given
 * activity or activity category
 * @param activity The activity or activity category for which to get the icon
 * @param markerType The type of marker to use ('round' or 'square')
 * @returns The path to the marker icon for the activity
 */
export const getActivityMarkerIcon = (
    activity: ActivityCategory | Activity | null | undefined,
    markerType: MarkerType = 'round'
): string => {
    return `${resolveIconBasePath(activity)}-marker_${markerType}.svg`;
};
