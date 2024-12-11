/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputSelectType, isGroupedChoice, ChoiceType } from 'evolution-common/lib/services/questionnaire/types';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { CommonInputProps } from './CommonInputProps';

export type InputSelectProps = CommonInputProps & {
    value?: string;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputSelectType;
};

export interface InputSelectOptionProps {
    choice: ChoiceType;
    interview: UserInterviewAttributes;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
}

const InputSelectOption = (props: InputSelectOptionProps & WithTranslation) => {
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
            {surveyHelper.translateString(props.choice.label, props.i18n, props.interview, props.path, props.user)}
        </option>
    );
};

const InputSelectOptionT = withTranslation()(InputSelectOption) as React.FunctionComponent<InputSelectOptionProps>;

export const InputSelect = (props: InputSelectProps & WithTranslation) => {
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

            const groupLabel = surveyHelper.translateString(
                choice.groupLabel,
                props.i18n,
                props.interview,
                props.path,
                props.user
            );
            return _isBlank(groupLabel) ? (
                <React.Fragment>
                    <option disabled>_________</option>
                    {groupSelectOptions}
                </React.Fragment>
            ) : (
                <optgroup key={`input-select-group-container__${choice.groupShortname}`} label={groupLabel}>
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

export default withTranslation()(InputSelect);
