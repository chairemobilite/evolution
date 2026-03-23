/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type { TFunction } from 'i18next';
import { getResponse } from '../../../../utils/helpers';
import type { RadioChoiceType, UserInterviewAttributes, VisitedPlace, WidgetConditional } from '../../types';
import { VisitedPlacesSectionConfiguration, WidgetConfig } from '../../../questionnaire/types';
import {
    type Activity,
    type ActivityCategory,
    activityToDisplayCategory,
    incompatibleConsecutiveActivities
} from '../../../odSurvey/types';
import type { WidgetFactoryOptions } from '../types';
import * as odHelpers from '../../../odSurvey/helpers';
import { getActivityIcon } from './activityIconMapping';
import * as visitedPlacesHelpers from './helpers';
import config from '../../../../config/project.config';

const isInActivityCategoryConditional = (visitedPlace: VisitedPlace, activity: Activity) => {
    if (_isBlank(visitedPlace.activityCategory)) {
        return false;
    }
    return activityToDisplayCategory[activity].includes(visitedPlace.activityCategory as ActivityCategory);
};

const validateActivityOfNextPrevious = (
    visitedPlace: VisitedPlace,
    interview: UserInterviewAttributes,
    activity: Activity
) => {
    if (!incompatibleConsecutiveActivities[activity]) {
        return true;
    }
    return visitedPlacesHelpers.validatePreviousNextPlaceIsCompatibleActivities({
        interview,
        visitedPlace,
        incompatibleConsecutiveActivities: incompatibleConsecutiveActivities[activity]
    });
};

const perActivityConditionals: Partial<{ [mode in Activity]: WidgetConditional }> = {
    // TODO Add any specific conditionals for activities here, for example to hide certain activities based on the person's attributes
    workUsual: (interview) => {
        const person = odHelpers.getActivePerson({ interview });
        const occupation = person?.occupation;

        // FIXME Taken from od_nationale, where a usual work place is defined
        // with the household member section. May not be generic enough. The
        // condition should be updated.
        return (
            !occupation ||
            (!_isBlank((person as any).usualWorkPlace) &&
                !_isBlank((person as any).usualWorkPlace.geography) &&
                ['fullTimeWorker', 'partTimeWorker', 'workerAndStudent'].includes(occupation))
        );
    },
    schoolUsual: (interview) => {
        const person = odHelpers.getActivePerson({ interview });
        if (!person) {
            return false;
        }
        const occupation = person.occupation;

        if (odHelpers.isStudentFromSchoolType({ person })) {
            return true;
        }

        // FIXME Taken from od_nationale, where a usual school place is defined
        // with the household member section. May not be generic enough. The
        // condition should be updated.
        return (
            !occupation ||
            (!_isBlank((person as any).usualSchoolPlace) &&
                !_isBlank((person as any).usualSchoolPlace.geography) &&
                (['fullTimeStudent', 'partTimeStudent', 'workerAndStudent'].includes(occupation) ||
                    (!_isBlank(person.age) && person.age! <= config.schoolMandatoryAge)))
        );
    },
    carElectricChargingStation: (interview) => {
        // Display to people with a driving license
        const person = odHelpers.getActivePerson({ interview });
        if (!person) {
            return false;
        }
        return odHelpers.hasOrUnknownDrivingLicense({ person });
    },
    carsharingStation: (interview) => odHelpers.getCarsharingMembersCount({ interview }) > 0
};

const getActivityChoices = (filteredActivities: Activity[]): RadioChoiceType[] =>
    filteredActivities.map((activity) => ({
        value: activity,
        label: (t: TFunction) => t(`visitedPlaces:activities.${activity}`),
        conditional: function (interview, path) {
            const visitedPlace = getResponse(interview, path, null, '../') as VisitedPlace;
            // Return false if the activity category of the visited place is not compatible with the activity of the choice
            if (!isInActivityCategoryConditional(visitedPlace, activity)) {
                return false;
            }
            if (!validateActivityOfNextPrevious(visitedPlace, interview, activity)) {
                return false;
            }
            // Run the perActivity conditional if it exists
            const conditional = perActivityConditionals[activity];
            return conditional ? conditional(interview, path) : true;
        },
        iconPath: getActivityIcon(activity)
    }));

export const getActivityWidgetConfig = (
    sectionConfig: VisitedPlacesSectionConfiguration,
    _options: WidgetFactoryOptions
): WidgetConfig => {
    const filteredActivities = visitedPlacesHelpers.getFilteredActivities(sectionConfig);
    if (filteredActivities.length === 0) {
        throw new Error('No available activities to create activity widget configuration');
    }
    const activityChoices = getActivityChoices(filteredActivities);

    return {
        type: 'question',
        path: 'activity',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'string',
        columns: 2,
        label: (t: TFunction) => t('visitedPlaces:Activity'),
        choices: activityChoices,
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t('visitedPlaces:activityIsRequiredError')
                }
            ];
        },
        conditional: function (interview, path) {
            const visitedPlace = getResponse(interview, path, null, '../') as VisitedPlace;
            const activityCategory = visitedPlace?.activityCategory;
            if (_isBlank(activityCategory)) {
                return [false, null];
            }

            // Check if there is more than one choice available for this visited place
            // TODO: Fix cleanly in evolution. See https://github.com/chairemobilite/evolution/issues/110
            const activities = activityChoices.filter(
                (choice) => choice.conditional === undefined || choice.conditional(interview, path) === true
            );
            if (activities.length <= 1) {
                return [false, activities[0] ? activities[0].value : null];
            }
            return [true, null];
        }
    };
};
