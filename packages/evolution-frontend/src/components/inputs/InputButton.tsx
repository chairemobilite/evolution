/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { ChoiceType, InputButtonType } from '../../services/widgets';
import * as surveyHelper from '../../utils/helpers';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';
import { WithTranslation, withTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export interface InputButtonProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    onValueChange: (e: any) => void;
    value: string;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: FrontendUser;
    inputRef?: React.LegacyRef<HTMLTextAreaElement>;
    size?: 'small' | 'medium' | 'large';
    widgetConfig: InputButtonType;
    closeQuestionModal?: (path: string) => void;
    questionModalPath?: string;
}

export interface InputButtonOptionProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    choice: ChoiceType;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: FrontendUser;
    onButtonClick: (e: React.MouseEvent, value: string) => void;
}

const InputButtonOption = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputButtonOptionProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    if (
        props.choice.hidden === true ||
        !surveyHelper.parseBoolean(props.choice.conditional, props.interview, props.path, props.user)
    ) {
        return null;
    }
    return (
        <div key={`${props.id}__key`} className={'survey-question__input-button-input-container'}>
            <button
                type="button"
                className={`survey-section__button button ${props.choice.color || 'green'} ${
                    props.choice.size || 'large'
                }`}
                onClick={(e) => props.onButtonClick(e, props.choice.value)}
                id={props.id}
            >
                {props.choice.icon && <FontAwesomeIcon icon={props.choice.icon} className="faIconLeft" />}
                {surveyHelper.parseString(
                    props.choice.label[props.i18n.language] || props.choice.label,
                    props.interview,
                    props.path
                )}
            </button>
        </div>
    );
};

const InputButtonOptionT = withTranslation()(InputButtonOption);

/** Display a list of choices as buttons */

const InputButton = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputButtonProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    const widgetChoices = props.widgetConfig.choices;
    const choices =
        typeof widgetChoices === 'function' ? widgetChoices(props.interview, props.path, props.user) : widgetChoices;

    // FIXME: original code had an action parameter, that was part of the choice object. It isn't used anywhere though and the saveCallback and valueChange should be enough to cover the case. If not, revisit this.
    const onButtonClick = (e: React.MouseEvent, value: string) => {
        e.preventDefault();
        props.onValueChange({ target: { value } });

        if (props.widgetConfig.isModal === true && props.closeQuestionModal) {
            props.closeQuestionModal(props.questionModalPath || '');
        }
    };

    const choiceInputs = choices.map((choice, index) => (
        <InputButtonOptionT
            key={`${props.id}_btn_${index}`}
            id={`${props.id}__input-button__${choice.value}`}
            choice={choice}
            path={props.path}
            interview={props.interview}
            user={props.user}
            onButtonClick={onButtonClick}
        />
    ));

    return (
        <div
            className={`survey-question__input-button-group-container${
                props.widgetConfig.sameLine === false ? ' no-wrap' : ''
            }${props.widgetConfig.align === 'center' ? ' align-center' : ''}`}
        >
            {choiceInputs}
        </div>
    );
};

export default withTranslation()(InputButton);
