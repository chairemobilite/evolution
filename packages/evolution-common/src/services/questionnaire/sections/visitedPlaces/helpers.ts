/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _isEqual from 'lodash/isEqual';
import {
    type Activity,
    type ActivityCategory,
    activityCategoryValues,
    activityValues,
    activityToDisplayCategory
} from '../../../odSurvey/types';
import type {
    Journey,
    Person,
    UserInterviewAttributes,
    VisitedPlace,
    VisitedPlacesSectionConfiguration
} from '../../types';
import * as odSurveyHelpers from '../../../odSurvey/helpers';

/**
 * Validate that the activity of the previous and next places are not in the
 * list of incompatible activities for the current activity choice.
 * @param arg
 * @param arg.interview The interview to get the previous and next visited
 * places from
 * @param arg.path The path of the current visited place widget, used to get the
 * visited place context and the previous and next visited places
 * @param arg.incompatibleActivities The list of incompatible activities for the
 * current activity choice
 * @returns True if the previous and next visited places have an activity that
 * is not in the list of incompatible activities
 */
export const validatePreviousNextPlaceIsCompatibleActivities = ({
    interview,
    path,
    incompatibleConsecutiveActivities
}: {
    interview: UserInterviewAttributes;
    path: string;
    incompatibleConsecutiveActivities: Activity[];
}) => {
    const visitedPlaceContext = odSurveyHelpers.getVisitedPlaceContextFromPath({ interview, path });
    console.log('Visited place context for path', path, ':', visitedPlaceContext);
    if (!visitedPlaceContext) {
        console.warn(
            'Warning: validatePreviousNextPlaceIsCompatibleActivities called but no active journey found in the interview. This conditional will return true, but this may indicate a problem with the interview data or the order of conditionals.'
        );
        return true;
    }
    const { journey, visitedPlace } = visitedPlaceContext;
    const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
        journey,
        visitedPlaceId: visitedPlace._uuid
    });
    const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
        journey,
        visitedPlaceId: visitedPlace._uuid
    });
    console.log(
        'previous/next visited places for visited place with id',
        visitedPlace._uuid,
        ':',
        previousVisitedPlace,
        nextVisitedPlace
    );
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

/**
 * Get the household usual places by household member ID. Usual places are
 * returned only if they have a geography.
 *
 * @param options.interview The interview data.
 * @returns An object containing usual places mappings by person ID.
 */
const getHouseholdUsualPlacesByPersonId = ({
    interview
}: {
    interview: UserInterviewAttributes;
}): { [personId: string]: VisitedPlace[] } => {
    // Get all household members
    const persons = odSurveyHelpers.getPersonsArray({ interview });
    const usualPlacesByPersonId: { [personId: string]: VisitedPlace[] } = {};
    for (const person of persons) {
        // Get the person's usual places, if they have a geography defined and
        // transform them to visited places object, with the activity set, and
        // the uuid and sequence set
        const personUsualPlaces: VisitedPlace[] = [];
        usualPlacesByPersonId[person._uuid] = personUsualPlaces;
        if (person.usualWorkPlace && person.usualWorkPlace.geography) {
            personUsualPlaces.push({
                ...person.usualWorkPlace,
                activity: 'workUsual',
                _uuid: 'usualWorkPlace',
                _sequence: 1
            });
        }
        if (person.usualSchoolPlace && person.usualSchoolPlace.geography) {
            personUsualPlaces.push({
                ...person.usualSchoolPlace,
                activity: 'schoolUsual',
                _uuid: 'usualSchoolPlace',
                _sequence: 1
            });
        }
        usualPlacesByPersonId[person._uuid] = personUsualPlaces;
    }
    return usualPlacesByPersonId;
};

/**
 * Get the household visited places array by person ID. It returns all the
 * visited places, no matter if they are shortcuts or loop activities.
 *
 * @param options.interview The interview data.
 * @returns An object containing visited places mappings by person ID.
 */
const getHouseholdVisitedPlacesByPersonId = ({
    interview
}: {
    interview: UserInterviewAttributes;
}): { [personId: string]: { visitedPlace: VisitedPlace; journey: Journey }[] } => {
    // Get household members
    const persons = odSurveyHelpers.getPersonsArray({ interview });
    const visitedPlacesByPersonId: { [personId: string]: { visitedPlace: VisitedPlace; journey: Journey }[] } = {};

    // Get the visited places of all journeys of household members
    for (const person of persons) {
        // Get the person's visited places
        const personJourneys = odSurveyHelpers.getJourneysArray({ person });
        const visitedPlacesWithJourney = personJourneys.flatMap((journey) => {
            const personVisitedPlacesArray = odSurveyHelpers.getVisitedPlacesArray({ journey });
            return personVisitedPlacesArray.map((visitedPlace) => ({
                visitedPlace,
                journey
            }));
        });
        visitedPlacesByPersonId[person._uuid] = visitedPlacesWithJourney;
    }
    return visitedPlacesByPersonId;
};

/**
 * Get the list of visited places that can be proposed as shortcuts for the
 * current visited place being located, based on the interview data. The list
 * includes both usual places and previously located places, but excludes places
 * that are not compatible with the current activity, that have no geographies,
 * or that have already the same geography as previous or next places.
 *
 * @param options.interview The interview data.
 * @param options.currentVisitedPlace The currently located visited place, used
 * to get the previous and next places for comparison.
 * @param options.journey The journey of the current visited place, used to get
 * the previous and next places for comparison.
 * @param options.person The person of the current visited place, used to get
 * the usual places of the person and to display the person's identification in
 * the shortcut label.
 * @returns A list of visited places that can be proposed as shortcuts, with
 * their corresponding person and visited place ID to use as shortcut value.
 * The visited place ID is the path to the visited place in the interview
 * response, to be used as shortcut value if the place is a previously located
 * place, or 'household.persons.{personId}.usualWorkPlace' or
 * 'household.persons.{personId}.usualSchoolPlace' if it's a usual place.  The
 * person object is also returned to be able to display the person's
 * identification in the shortcut label.
 */
export const getShortcutVisitedPlaces = ({
    interview,
    journey,
    person,
    currentVisitedPlace
}: {
    interview: UserInterviewAttributes;
    journey: Journey;
    person: Person;
    currentVisitedPlace: VisitedPlace;
}): { person: Person; visitedPlacePath: string; visitedPlace: VisitedPlace }[] => {
    // Function to get a place's coordinates, by getting its geography, then
    // extracting the coordinates. Returns null if the place has no geography or
    // if the geography has no coordinates.
    const getPlaceCoordinates = (place: VisitedPlace | null, person: Person) => {
        const placeGeography = place
            ? odSurveyHelpers.getVisitedPlaceGeography({
                visitedPlace: place,
                interview,
                person
            })
            : undefined;
        return placeGeography?.geometry?.coordinates ?? null;
    };

    // Get previous and next place coordinates to be able to exclude visited places with the same geography
    const previousVisitedPlace = odSurveyHelpers.getPreviousVisitedPlace({
        journey,
        visitedPlaceId: currentVisitedPlace._uuid
    });
    const previousVisitedPlaceCoordinates = getPlaceCoordinates(previousVisitedPlace, person);

    const nextVisitedPlace = odSurveyHelpers.getNextVisitedPlace({
        journey,
        visitedPlaceId: currentVisitedPlace._uuid
    });
    const nextVisitedPlaceCoordinates = getPlaceCoordinates(nextVisitedPlace, person);

    // Function to check if a place has compatible coordinates, meaning that it
    // has coordinates defined and they are different from the previous and next
    // places if they have coordinates
    const hasCompatibleCoordinates = (place: VisitedPlace) => {
        const placeCoordinates = getPlaceCoordinates(place, person);
        // FIXME Should we also check for proximity between the coordinates
        // instead of exact equality, to be able to exclude places that are very
        // close but not exactly the same, or to avoid issues with coordinates
        // precision?
        return (
            placeCoordinates !== null &&
            (previousVisitedPlaceCoordinates === null ||
                !_isEqual(placeCoordinates, previousVisitedPlaceCoordinates)) &&
            (nextVisitedPlaceCoordinates === null || !_isEqual(placeCoordinates, nextVisitedPlaceCoordinates))
        );
    };

    const shortcutPlaces: { person: Person; visitedPlacePath: string; visitedPlace: VisitedPlace }[] = [];

    // Add usual places of the household members
    const usualPlacesByPersonId = getHouseholdUsualPlacesByPersonId({ interview });
    for (const personId in usualPlacesByPersonId) {
        const person = odSurveyHelpers.getPerson({ interview, personId });
        if (person === null) {
            continue;
        }
        const personUsualPlaces = usualPlacesByPersonId[personId];
        for (let i = 0, count = personUsualPlaces.length; i < count; i++) {
            const usualPlace = personUsualPlaces[i];

            if (hasCompatibleCoordinates(usualPlace)) {
                shortcutPlaces.push({
                    person,
                    visitedPlacePath: `household.persons.${personId}.${usualPlace.activity === 'workUsual' ? 'usualWorkPlace' : 'usualSchoolPlace'}`,
                    visitedPlace: usualPlace
                });
            }
        }
    }

    // Add the visited places of the household members
    const visitedPlacesByPersonId = getHouseholdVisitedPlacesByPersonId({ interview });
    for (const personId in visitedPlacesByPersonId) {
        const person = odSurveyHelpers.getPerson({ interview, personId });
        if (person === null) {
            continue;
        }
        const personVisitedPlaces = visitedPlacesByPersonId[personId];
        for (let i = 0, count = personVisitedPlaces.length; i < count; i++) {
            const { visitedPlace: personVisitedPlace, journey: placeJourney } = personVisitedPlaces[i];

            // Ignore places that are already shortcuts or usual places, or that have incompatible activities or the current place
            if (
                personVisitedPlace.shortcut ||
                (personVisitedPlace.activity === 'workUsual' &&
                    person.usualWorkPlace &&
                    person.usualWorkPlace.geography) ||
                (personVisitedPlace.activity === 'schoolUsual' &&
                    person.usualSchoolPlace &&
                    person.usualSchoolPlace.geography) ||
                personVisitedPlace.activity === 'home' ||
                odSurveyHelpers.isLoopActivity({ visitedPlace: personVisitedPlace }) ||
                personVisitedPlace._uuid === currentVisitedPlace._uuid
            ) {
                continue;
            }

            // Add only if the visited place has coordinates that are distinct
            // from the ones from the previous or next places, to avoid
            // proposing shortcuts to the same places
            if (hasCompatibleCoordinates(personVisitedPlace)) {
                shortcutPlaces.push({
                    person,
                    visitedPlacePath: `household.persons.${personId}.journeys.${placeJourney._uuid}.visitedPlaces.${personVisitedPlace._uuid}`,
                    visitedPlace: personVisitedPlace
                });
            }
        }
    }
    return shortcutPlaces;
};
