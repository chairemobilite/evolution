/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type {
    I18nData,
    RadioChoiceType,
    VisitedPlacesSectionConfiguration,
    WidgetConditional,
    WidgetConfig
} from '../../../questionnaire/types';
import type { TFunction } from 'i18next';
import * as odHelpers from '../../../odSurvey/helpers';
import type { ActivityCategory } from '../../../odSurvey/types';
import { getActivityIcon } from './activityIconMapping';
import type { WidgetFactoryOptions } from '../types';
import config from '../../../../config/project.config';
import * as visitedPlacesHelpers from './helpers';

const perActivityCategoryLabels: Partial<{ [category in ActivityCategory]: I18nData }> = {
    school: (t: TFunction, interview) => {
        const person = odHelpers.getPerson({ interview });
        if (person?.schoolType === 'childcare') {
            return t('visitedPlaces:activityCategories.childcare');
        } else if (person?.schoolType === 'kindergarten') {
            return t('visitedPlaces:activityCategories.kindergarten');
        } else if (
            person?.schoolType &&
            (person.schoolType === 'kindergartenFor4YearsOld' ||
                person.schoolType === 'primarySchool' ||
                person.schoolType === 'secondarySchool')
        ) {
            return t('visitedPlaces:activityCategories.school');
        } else {
            return t('visitedPlaces:activityCategories.schoolStudies');
        }
    }
};

const perActivityCategoryConditionals: Partial<{ [category in ActivityCategory]: WidgetConditional }> = {
    home: function (interview, path) {
        // Only show the home activity category if the previous and next visited places are not home
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            return false;
        }
        const { journey, visitedPlace: activeVisitedPlace } = visitedPlaceContext;
        const nextVisitedPlace = odHelpers.getNextVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        return (
            (!previousVisitedPlace || (previousVisitedPlace && previousVisitedPlace.activityCategory !== 'home')) &&
            (!nextVisitedPlace || (nextVisitedPlace && nextVisitedPlace.activityCategory !== 'home'))
        );
    },
    work: function (interview) {
        // Hide if younger than working age
        const person = odHelpers.getPerson({ interview });
        if (!person) {
            return false;
        }
        // Return true if age is undefined, as we don't want to hide the work
        // activity category for people with undefined age
        return _isBlank(person.age) || person.age! >= config.workingAge;
    },
    school: function (interview) {
        const person = odHelpers.getPerson({ interview });
        if (!person) {
            return false;
        }
        const occupation = person.occupation;

        // Return true if age and occupation are undefined or null, as we don't
        // want to hide the school activity category in surveys where the
        // question might not be asked
        if (_isBlank(person.age) && _isBlank(occupation)) {
            return true;
        }
        // Return true if an occupation is set and it is one of the student or
        // worker occupations, or if isStudentFromEnrolled is true.
        // FIXME Should this condition actually be a single `isStudent` helper function to replace the `isStudentFromEnrolled`? Current condition comes from od_nationale_quebec. See how to implement in Evolution
        return (
            (!_isBlank(occupation) &&
                ['fullTimeWorker', 'partTimeWorker', 'fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].includes(
                    occupation!
                )) ||
            odHelpers.isStudentFromSchoolType({ person })
        );
    },
    otherParentHome: function (interview, path) {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            return false;
        }
        const { person, journey, visitedPlace: activeVisitedPlace } = visitedPlaceContext;
        const nextVisitedPlace = odHelpers.getNextVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        const previousVisitedPlace = odHelpers.getPreviousVisitedPlace({
            journey,
            visitedPlaceId: activeVisitedPlace._uuid
        });
        return (
            !_isBlank(person.age) &&
            person.age! < config.adultAge &&
            (!previousVisitedPlace || previousVisitedPlace.activityCategory !== 'otherParentHome') &&
            (!nextVisitedPlace || nextVisitedPlace.activityCategory !== 'otherParentHome')
        );
    }
};

// FIXME Could there be categories without activities? But if we check the
// conditionals of activities, we would need to have a per-render cache,
// otherwise, the conditionals are run many times!
const getActivityCategoryChoices = (filteredCategories: ActivityCategory[]): RadioChoiceType[] =>
    filteredCategories.map((category) => ({
        value: category,
        label:
            perActivityCategoryLabels[category] ??
            ((t: TFunction) => t(`visitedPlaces:activityCategories.${category}`)),
        conditional:
            perActivityCategoryConditionals[category] !== undefined
                ? perActivityCategoryConditionals[category]
                : undefined,
        iconPath: getActivityIcon(category)
    }));

/**
 * Get the activity category widget configuration for the visited place section.
 * @param sectionConfig The configuration of the section
 * @param options The widget factory options
 * @returns The widget configuration for the activity category question, which
 * is a radio input with the available activity categories
 */
export const getActivityCategoryWidgetConfig = (
    sectionConfig: VisitedPlacesSectionConfiguration,
    _options: WidgetFactoryOptions
): WidgetConfig => {
    const filteredActivities = visitedPlacesHelpers.getFilteredActivities(sectionConfig);
    const filteredCategories = visitedPlacesHelpers.getFilteredActivityCategories(filteredActivities);
    if (filteredCategories.length === 0) {
        throw new Error('No available activity categories to create activityCategory widget configuration');
    }
    const choices = getActivityCategoryChoices(filteredCategories);
    return {
        type: 'question',
        path: 'activityCategory',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'string',
        columns: 2,
        containsHtml: true,
        useAssignedValueOnHide: true,
        choices,
        label: (t: TFunction, interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (!visitedPlaceContext) {
                throw new Error('Visited place context not found for path ' + path);
            }
            const { journey, visitedPlace: activeVisitedPlace } = visitedPlaceContext;
            const visitedPlacesArray = odHelpers.getVisitedPlacesArray({ journey });
            const firstVisitedPlace = visitedPlacesArray[0];
            const secondVisitedPlace = visitedPlacesArray[1];
            if (firstVisitedPlace && firstVisitedPlace._uuid === activeVisitedPlace._uuid) {
                return t('visitedPlaces:ActivityCategoryFirstLocation');
            } else if (
                firstVisitedPlace &&
                secondVisitedPlace &&
                firstVisitedPlace.activity === 'home' &&
                secondVisitedPlace._uuid === activeVisitedPlace._uuid
            ) {
                return t('visitedPlaces:ActivityCategoryAfterHome');
            } else {
                return t('visitedPlaces:ActivityCategory');
            }
        },
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t('visitedPlaces:activityIsRequiredError')
                }
            ];
        },
        conditional: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (!visitedPlaceContext) {
                return [true];
            }
            const { visitedPlace: activeVisitedPlace } = visitedPlaceContext;
            // Do not show for the a new place that is home
            // FIXME This is copy pasted from od_nationale_quebec. Is this right? Do we want to hide the activity category question for a new visited place that is home? What if the user wants to change the activity category of a new visited place that is home?
            return (activeVisitedPlace as any)._isNew === true && activeVisitedPlace.activityCategory === 'home'
                ? [false, activeVisitedPlace.activityCategory]
                : [true];
        }
    };
};
