/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputSelectType, isGroupedChoice, ChoiceType } from '../../services/widgets';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import * as surveyHelper from '../../utils/helpers';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';

export interface InputSelectProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    onValueChange?: (e: any) => void;
    value?: string;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: FrontendUser;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    size?: 'small' | 'medium' | 'large';
    widgetConfig: InputSelectType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
}

export interface InputSelectOptionProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    choice: ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: FrontendUser;
}

const InputSelectOption = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputSelectOptionProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    if (
        props.choice.hidden === true ||
        !surveyHelper.parseBoolean(props.choice.conditional, props.interview, props.path, props.user)
    ) {
        return null;
    }
    return (
        <option
            key={`input-select-container__${props.choice.value}`}
            value={props.choice.value}
            className={'input-select-option'}
        >
            {surveyHelper.parseString(
                props.choice.label[props.i18n.language] || props.choice.label,
                props.interview,
                props.path,
                props.user
            )}
        </option>
    );
};

const InputSelectOptionT = withTranslation()(InputSelectOption) as React.FunctionComponent<
    InputSelectOptionProps<any, any, any, any>
>;

export const InputSelect = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputSelectProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    const widgetChoices = props.widgetConfig.choices;
    const choices =
        typeof widgetChoices === 'function' ? widgetChoices(props.interview, props.path, props.user) : widgetChoices;

    let isGrouped = false;
    const selectOptions = choices.map((choice) => {
        if (isGroupedChoice(choice)) {
            isGrouped = true;
            const groupSelectOptions = choice.choices.map((groupedChoice, index) => (
                <InputSelectOptionT
                    key={`${props.id}_opt_${index}`}
                    choice={groupedChoice as any}
                    path={props.path}
                    interview={props.interview}
                    user={props.user}
                />
            ));

            return (
                <optgroup
                    key={`input-select-group-container__${choice.groupShortname}`}
                    label={choice.groupLabel[props.i18n.language] || choice.groupLabel}
                >
                    {groupSelectOptions}
                </optgroup>
            );
        } else {
            return (
                <InputSelectOptionT
                    key={`${props.id}_opt_${choice.value}`}
                    choice={choice as any}
                    path={props.path}
                    interview={props.interview}
                    user={props.user}
                />
            );
        }
    }, this);

    return (
        <div className="survey-question__input-select-container">
            <select
                id={props.id}
                onChange={props.onValueChange}
                value={_isBlank(props.value) ? '' : props.value}
                style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                }}
            >
                <option key={'input-select-container__blank'} value="" className={'input-select-option'}></option>

                {selectOptions}
                {
                    isGrouped === false && (
                        <optgroup key="-1" label=""></optgroup>
                    ) /* if no group, add an empty group (hack) to make sure <option> with long text are not truncated on small width screens (iphone) */
                }
            </select>
        </div>
    );
};

export default withTranslation()(InputSelect) as React.FunctionComponent<InputSelectProps<any, any, any, any>>;
