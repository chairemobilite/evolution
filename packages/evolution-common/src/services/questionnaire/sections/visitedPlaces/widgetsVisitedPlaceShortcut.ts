/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TFunction } from 'i18next';
import {
    ChoiceType,
    InputRadioType,
    InputSelectType,
    VisitedPlacesSectionConfiguration,
    WidgetConfig
} from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import { requiredValidation } from '../../../widgets/validations/validations';
import { yesNoChoices } from '../common/choices';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { getShortcutVisitedPlaces } from './helpers';

// Visited
const visitedPlaceAlreadyVisited: InputRadioType = {
    type: 'question',
    inputType: 'radio',
    datatype: 'boolean',
    columns: 1,
    path: 'alreadyVisitedBySelfOrAnotherHouseholdMember',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const activePerson = odHelpers.getPerson({ interview, path });
        if (activePerson === null) {
            throw new Error('Active person not found in interview response');
        }
        const nickname = odHelpers.getPersonIdentificationString({ person: activePerson, t });
        const countPersons = odHelpers.countPersons({ interview });
        return t('visitedPlaces:alreadyVisitedBySelfOrAnotherHouseholdMember', {
            nickname,
            count: countPersons
        });
    },
    choices: yesNoChoices,
    conditional: (interview, path) => {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            console.error('Visited place context not found for path', path);
            return [false, null];
        }
        const { visitedPlace, person, journey } = visitedPlaceContext;

        // Do not show if activity is not set
        if (_isBlank(visitedPlace.activity)) {
            return [false, null];
        }

        // Do not display if it is an incompatible activity
        const isIncompatibleActivity =
            odHelpers.isLoopActivity({ visitedPlace }) ||
            odHelpers.isUsualActivity({ visitedPlace }) ||
            visitedPlace.activity === 'home';
        if (isIncompatibleActivity) {
            return [false, null];
        }

        // Display if there are possible shortcuts
        const lastAction = visitedPlace.geography?.properties?.lastAction ?? null;
        const shortcuts = getShortcutVisitedPlaces({ interview, currentVisitedPlace: visitedPlace, journey, person });
        return [(lastAction === null || lastAction === 'shortcut') && shortcuts.length > 0, null];
    },
    validations: requiredValidation
};

const visitedPlaceShortcut: InputSelectType = {
    type: 'question',
    path: 'shortcut',
    inputType: 'select',
    datatype: 'string',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction, interview, path) => {
        const activePerson = odHelpers.getPerson({ interview, path });
        if (activePerson === null) {
            throw new Error('Active person not found in interview response');
        }
        const nickname = odHelpers.getPersonIdentificationString({ person: activePerson, t });
        const countPersons = odHelpers.countPersons({ interview });
        return t('visitedPlaces:shortcut', {
            nickname,
            count: countPersons
        });
    },
    choices: function (interview, path) {
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            throw new Error(
                'widgetVisitedPlaceShortcut: choices function: visited place context not found for path ' + path
            );
        }
        const { visitedPlace, person, journey } = visitedPlaceContext;

        // Get shortcut places
        const shortcuts = getShortcutVisitedPlaces({ interview, currentVisitedPlace: visitedPlace, journey, person });

        const choices: ChoiceType[] = [];
        for (let i = 0, count = shortcuts.length; i < count; i++) {
            const shortcut = shortcuts[i];
            choices.push({
                value: shortcut.visitedPlacePath,
                label: (t: TFunction) =>
                    odHelpers.getVisitedPlaceDescription({
                        visitedPlace: shortcut.visitedPlace,
                        person: shortcut.person,
                        t,
                        interview,
                        options: {
                            withTimes: true,
                            withActivity: false,
                            withPersonIdentification: true,
                            allowHtml: false
                        }
                    })
            });
        }
        return choices;
    },
    conditional: function (interview, path) {
        // Show if activity is set and
        const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
        if (!visitedPlaceContext) {
            throw new Error(
                'widgetVisitedPlaceShortcut: conditional function: visited place context not found for path ' + path
            );
        }
        const { visitedPlace } = visitedPlaceContext;

        // Show the alreadyVisitedBySelfOrAnotherHouseholdMember is true
        return [visitedPlace.alreadyVisitedBySelfOrAnotherHouseholdMember === true, null];
    }
};

/**
 * For trip diaries, this class provides the required widgets to allow to
 * specify if a location was already declared during the survey and provide a
 * list of possible shortcuts to the various places. It provides 2 widgets:
 *
 * - `visitedPlaceAlreadyVisited`: a boolean radio question to specify if the
 *   place was already visited. It is shown only if the activity is neither a
 *   loop or usual activity and if there are possible shortcuts. The label to
 *   override for the question is
 *   "visitedPlaces:alreadyVisitedBySelfOrAnotherHouseholdMember" and includes
 *   the count of household members.
 * - `visitedPlaceShortcut`: a widget to select a shortcut for the visited
 *   place. It lists all usual and visited places by self or other household
 *   members that are not the same as the previous or next locations. The label
 *   to override for the questions is "visitedPlaces:shortcut" and includes the
 *   nickname of the current person and the count of household members. Shown
 *   only if `visitedPlaceAlreadyVisited` is true.
 */
export class VisitedPlaceShortcutWidgetFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    getWidgetConfigs = (): Record<string, WidgetConfig> => ({
        visitedPlaceAlreadyVisited,
        visitedPlaceShortcut
    });
}
