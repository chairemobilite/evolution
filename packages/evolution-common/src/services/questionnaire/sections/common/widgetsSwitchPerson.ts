/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ButtonWidgetConfig, TextWidgetConfig } from '../../../questionnaire/types';
import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import { InterviewUpdateCallbacks, UserInterviewAttributes } from '../../types';

const hasMoreThanOneInterviewablePerson = (interview: UserInterviewAttributes): boolean =>
    odHelpers.getInterviewablePersonsArray({ interview }).length > 1;

const activePersonTitle: TextWidgetConfig = {
    type: 'text',
    align: 'center',
    containsHtml: true,
    classes: '',
    text: (t: TFunction, interview: UserInterviewAttributes, _path: string) => {
        const activePerson = odHelpers.getActivePerson({ interview });
        if (activePerson === null) {
            return '';
        }
        return t(['customSurvey:ActivePersonTitle', 'survey:ActivePersonTitle'], {
            context: activePerson.nickname === undefined ? 'unnamed' : '',
            name: activePerson.nickname || activePerson._sequence
        });
    },
    // Show if there is more than one person in the interview, even if there is only one interviewable person
    conditional: (interview) => odHelpers.countPersons({ interview }) > 1
};

const buttonSwitchPerson: ButtonWidgetConfig = {
    type: 'button',
    align: 'center',
    containsHtml: true,
    color: 'blue',
    size: 'small',
    hideWhenRefreshing: true,
    label: (t: TFunction) => t(['customSurvey:SwitchPersonTitle', 'survey:SwitchPersonTitle']),
    confirmPopup: {
        // FIXME Does the popup work? It seems like the allWidgetsValid is not really verified and the action happens anyway
        // FIXME allWdigetsValid is a frontend concept, figure out a better way to handle this
        conditional: (interview) => !(interview as any).allWidgetsValid,
        content: (t: TFunction) => t(['customSurvey:SwitchPersonNeedComplete', 'survey:SwitchPersonNeedComplete']),
        showConfirmButton: false,
        cancelButtonColor: 'blue',
        cancelButtonLabel: (t: TFunction) => t('main:OK')
    },
    conditional: (interview, _path) => [hasMoreThanOneInterviewablePerson(interview), undefined],
    action: function (
        callbacks: InterviewUpdateCallbacks,
        _interview: UserInterviewAttributes,
        _path: string,
        section,
        _sections,
        _saveCallback
    ) {
        // FIXME: We navigate to the selectPerson section... That means this widget should be part of a feature that contains this section
        callbacks.startUpdateInterview(section, {
            'responses._activeSection': 'selectPerson'
        });
    }
};

/**
 * For household surveys, this function provides the widget configurations to
 * switch between persons during the survey
 * @param options
 * @returns The widget configurations to switch between persons during a survey
 */
export const getSwitchPersonWidgets = (
    // FIXME: Type this when there is a few more widgets implemented
    _options: { context?: () => string } = {}
): { activePersonTitle: TextWidgetConfig; buttonSwitchPerson: ButtonWidgetConfig } => {
    // TODO These should be some configuration receive here to fine-tune the section's content
    return {
        activePersonTitle,
        buttonSwitchPerson
    };
};
