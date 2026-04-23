/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    type Activity,
    type ActivityCategory,
    activityCategoryValues,
    activityValues,
    activityToDisplayCategory
} from '../../../odSurvey/types';
import type { UserInterviewAttributes, VisitedPlace, VisitedPlacesSectionConfiguration } from '../../types';
import * as odSurveyHelpers from '../../../odSurvey/helpers';

/**
 * Validate that the activity of the previous and next places are not in the
 * list of incompatible activities for the current activity choice.
 * @param arg
 * @param arg.interview The interview to get the previous and next visited
 * places from
 * @param arg.incompatibleActivities The list of incompatible activities for the
 * current activity choice
 * @returns True if the previous and next visited places have an activity that
 * is not in the list of incompatible activities
 */
export const validatePreviousNextPlaceIsCompatibleActivities = ({
    interview,
    visitedPlace,
    incompatibleConsecutiveActivities
}: {
    interview: UserInterviewAttributes;
    visitedPlace: VisitedPlace;
    incompatibleConsecutiveActivities: Activity[];
}) => {
    const journey = odSurveyHelpers.getActiveJourney({ interview });
    if (!journey) {
        console.warn(
            'Warning: validatePreviousNextPlaceIsCompatibleActivities called but no active journey found in the interview. This conditional will return true, but this may indicate a problem with the interview data or the order of conditionals.'
        );
        return true;
    }

    const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
        journey,
        visitedPlaceId: visitedPlace._uuid
    });
    const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
        journey,
        visitedPlaceId: visitedPlace._uuid
    });
    return (
        (!previousVisitedPlace ||
            !previousVisitedPlace.activity ||
            !incompatibleConsecutiveActivities.includes(previousVisitedPlace.activity)) &&
        (!nextVisitedPlace ||
            !nextVisitedPlace.activity ||
            !incompatibleConsecutiveActivities.includes(nextVisitedPlace.activity))
    );
};

/**
 * Filter the available activities based on the visited places section
 * configuration.
 * If the section is enabled and activitiesIncludeOnly is set, keep only those
 * activities in the order specified. If the section is enabled and
 * activityExclude is set, exclude those activities.
 */
export const getFilteredActivities = (visitedPlacesConfig: VisitedPlacesSectionConfiguration): Activity[] => {
    if (visitedPlacesConfig.enabled === false) {
        return [] as unknown as Activity[];
    }

    if (visitedPlacesConfig.activitiesIncludeOnly) {
        if (visitedPlacesConfig.activityExclude) {
            console.warn(
                'Warning: visited places section configuration has both activitiesIncludeOnly and activityExclude set. The activityExclude will be ignored. Please check the configuration.'
            );
        }
        // Keep only activities that exist in both activitiesIncludeOnly and activityValues,
        // in the order specified in activitiesIncludeOnly
        return visitedPlacesConfig.activitiesIncludeOnly.filter((activity) =>
            (activityValues as readonly string[]).includes(activity)
        ) as Activity[];
    }

    if (visitedPlacesConfig.activityExclude) {
        // Exclude activities that are in activityExclude
        return activityValues.filter(
            (activity) => !visitedPlacesConfig.activityExclude!.includes(activity)
        ) as unknown as Activity[];
    }

    return activityValues as unknown as Activity[];
};

/**
 * Filter the available activity categories based on the filtered activities.
 * Only keep activity categories that have at least one available activity, or
 * that have no activities associated with them at all (self-contained categories
 * like 'home' that represent the activity themselves).
 */
export const getFilteredActivityCategories = (availableActivities: Activity[]): ActivityCategory[] => {
    return activityCategoryValues.filter((category) => {
        // Find all activities that map to this category
        const activitiesForCategory = (Object.entries(activityToDisplayCategory) as [Activity, ActivityCategory[]][])
            .filter(([_activity, categories]) => categories.includes(category))
            .map(([activity]) => activity);

        // If no activity maps to this category, do not include it and add a warning message in the console (this should not happen, but it's a safeguard against misconfiguration)
        if (activitiesForCategory.length === 0) {
            console.warn(
                `Warning: Activity category "${category}" has no activities associated with it. It will be excluded from the choices. Please check the activityToActivityCategory mapping configuration.`
            );
            return false;
        }

        // Otherwise, include the category only if at least one of its activities is available
        return activitiesForCategory.some((activity) => availableActivities.includes(activity));
    }) as ActivityCategory[];
};
