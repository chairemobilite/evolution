/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import DOMPurify from 'dompurify';
import { WithTranslation, withTranslation } from 'react-i18next';
import { shuffle } from 'chaire-lib-common/lib/utils/RandomUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { InputCheckboxType, ChoiceType } from 'evolution-common/lib/services/widgets';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { CommonInputProps } from './CommonInputProps';
import { sortByParameters } from './InputChoiceSorting';

export type InputCheckboxProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = CommonInputProps<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    value: string;
    /** Value of the custom field if 'other' is selected */
    customValue?: string;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputCheckboxType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO Document, what is this? Also, the presence of this props, that comes as a prop of question, is related to the presence of a customLabel, in the widgetConfig, what's the relation between those 2??
    customId?: string;
};

interface InputCheckboxState {
    customValue: string;
}

interface InputCheckboxChoiceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    choice: ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
    checked: boolean;
    iconSize: string;
    onCheckboxInputChange: React.ChangeEventHandler;
    onLabelClick: React.MouseEventHandler;
    onCheckboxClick: React.MouseEventHandler;
    onContainerClick: (
        inputCheckboxRef: React.RefObject<HTMLInputElement>,
        value: string,
        e: React.MouseEvent<HTMLDivElement>
    ) => void;
}

const InputCheckboxChoice = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputCheckboxChoiceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    const id = `${props.id}__input-checkbox__${props.choice.value}`;
    const strValue =
        props.choice.value !== null && props.choice.value !== undefined
            ? props.choice.value.toString()
            : props.choice.value;
    const strLabel = surveyHelper.translateString(
        props.choice.label,
        props.i18n,
        props.interview,
        props.path,
        props.user
    );
    const inputCheckboxRef: React.RefObject<HTMLInputElement> = React.createRef();
    const iconPath = props.choice.iconPath
        ? surveyHelper.parseString(props.choice.iconPath, props.interview, props.path)
        : null;
    return (
        <div
            onClick={(e) => {
                props.onContainerClick(inputCheckboxRef, props.choice.value, e);
            }}
            className={`survey-question__input-checkbox-input-container${props.checked ? ' checked' : ''}`}
        >
            <div className="label-input-container">
                <input
                    type="checkbox"
                    id={id}
                    name={props.id}
                    className={'input-checkbox'}
                    value={strValue}
                    checked={props.checked}
                    onChange={props.onCheckboxInputChange}
                    onClick={props.onCheckboxClick}
                    ref={inputCheckboxRef}
                />
                <label htmlFor={id} onClick={props.onLabelClick}>
                    {props.choice.icon && (
                        <span>
                            <FontAwesomeIcon
                                icon={props.choice.icon}
                                className="faIconLeft"
                                style={{ margin: 'auto 0' }}
                            />
                        </span>
                    )}
                    {iconPath && (
                        <span>
                            <img
                                src={iconPath}
                                className="faIconLeft"
                                style={{ height: props.iconSize, margin: '0 0.25em 0 0' }}
                                alt={strLabel}
                            />
                        </span>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: strLabel ? DOMPurify.sanitize(strLabel) : '' }} />
                </label>
            </div>
        </div>
    );
};

const InputCheckboxChoiceT = withTranslation()(InputCheckboxChoice) as React.FunctionComponent<
    InputCheckboxChoiceProps<any, any, any, any>
>;

export class InputCheckbox<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> extends React.Component<
    InputCheckboxProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation,
    InputCheckboxState
> {
    private customInputRef: React.RefObject<HTMLInputElement> = React.createRef();

    constructor(props: InputCheckboxProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation) {
        super(props);

        this.state = {
            customValue: props.customValue || ''
        };
        this.customInputRef = React.createRef();
    }

    onContainerClick = (
        inputCheckboxRef: React.RefObject<HTMLInputElement>,
        value: string,
        e: React.MouseEvent<HTMLDivElement>
    ) => {
        e.stopPropagation();
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: false
        });
        if (inputCheckboxRef.current) {
            inputCheckboxRef.current.dispatchEvent(clickEvent);
        }
    };

    onCheckboxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();

        const valueSet = new Set(this.props.value);
        const isChecked = e.target.checked;
        const checkboxValue = e.target.value;
        if (valueSet.has(checkboxValue) && !isChecked) {
            valueSet.delete(checkboxValue);
        } else if (!valueSet.has(checkboxValue) && isChecked) {
            valueSet.add(checkboxValue);
        }

        this.props.onValueChange({ target: { value: Array.from(valueSet) } }, this.state.customValue);
    };

    onCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    onLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    onCustomInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        this.props.onValueChange({ target: { value: this.props.value } }, e.target.value);
    };

    private getColumnedChoices = (choiceInputs: JSX.Element[]): JSX.Element[] => {
        if (
            this.props.widgetConfig.alignment === undefined &&
            this.props.widgetConfig.columns === undefined &&
            this.props.widgetConfig.rows === undefined &&
            (!this.props.widgetConfig.customAlignmentLengths ||
                this.props.widgetConfig.customAlignmentLengths === undefined)
        ) {
            return choiceInputs;
        }
        const widgetsByColumn = sortByParameters(
            choiceInputs,
            this.props.widgetConfig.alignment,
            this.props.widgetConfig.columns,
            this.props.widgetConfig.rows,
            this.props.widgetConfig.customAlignmentLengths
        );
        const columnedChoiceInputs: JSX.Element[] = [];
        for (let i = 0, count = widgetsByColumn.length; i < count; i++) {
            const columnWidgets = widgetsByColumn[i];
            if (this.props.widgetConfig.alignment === 'vertical') {
                columnedChoiceInputs.push(
                    <div className="survey-question__input-checkbox-group-column" key={i}>
                        {columnWidgets}
                    </div>
                );
            } else {
                columnedChoiceInputs.push(
                    <div className="survey-question__input-checkbox-group-row" key={i}>
                        {columnWidgets}
                    </div>
                );
            }
        }

        return columnedChoiceInputs;
    };

    render() {
        const widgetChoices = this.props.widgetConfig.choices;
        const valueSet = new Set(this.props.value);
        const choices =
            typeof widgetChoices === 'function' ? widgetChoices(this.props.interview, this.props.path) : widgetChoices;
        const iconSize = this.props.widgetConfig.iconSize || '2em';
        const parsedChoices =
            this.props.widgetConfig.shuffle === true
                ? shuffle(choices, undefined, this.props.widgetConfig.seed)
                : choices;
        if (this.props.widgetConfig.addCustom) {
            if (
                !parsedChoices
                    .map((choice) => {
                        return choice.value;
                    })
                    .includes('custom')
            )
                parsedChoices.push({
                    value: 'custom',
                    label: {
                        fr: 'Autre',
                        en: 'Other'
                    }
                });
        }
        const choiceInputs = parsedChoices
            .filter((choice) =>
                surveyHelper.parseBoolean(choice.conditional, this.props.interview, this.props.path, this.props.user)
            )
            .filter((choice) => choice.hidden !== true)
            .map((choice) => (
                <InputCheckboxChoiceT
                    choice={choice as any}
                    id={`${this.props.id}_${choice.value}`}
                    key={`${this.props.id}__${choice.value}__key`}
                    interview={this.props.interview}
                    path={this.props.path}
                    user={this.props.user}
                    checked={valueSet.has(choice.value)}
                    iconSize={iconSize}
                    onCheckboxClick={this.onCheckboxClick}
                    onCheckboxInputChange={this.onCheckboxInputChange}
                    onContainerClick={this.onContainerClick}
                    onLabelClick={this.onLabelClick}
                />
            ));

        // separate by columns if needed:
        const columnedChoiceInputs = this.getColumnedChoices(choiceInputs);

        const strCustomLabel = this.props.widgetConfig.customLabel
            ? surveyHelper.translateString(
                this.props.widgetConfig.customLabel,
                this.props.i18n,
                this.props.interview,
                this.props.path
            )
            : null;

        const shouldDisplayAsRows =
            this.props.widgetConfig.alignment === undefined || this.props.widgetConfig.alignment === 'auto' || this.props.widgetConfig.alignment === 'vertical';
        return (
            <div
                className={`${
                    shouldDisplayAsRows
                        ? 'survey-question__input-checkbox-group-container'
                        : 'survey-question__input-checkbox-group-container-column'
                }${this.props.widgetConfig.sameLine === false ? ' no-wrap' : ''}`}
            >
                {columnedChoiceInputs}
                {this.props.customId && (
                    <div className="label-input-custom-container">
                        {strCustomLabel && (
                            <label htmlFor={this.props.customId}>
                                <span>{strCustomLabel}</span>
                            </label>
                        )}
                        <input
                            type="text"
                            tabIndex={-1}
                            autoComplete="none"
                            id={this.props.customId}
                            name={this.props.customId}
                            className={'apptr__form-input input-custom apptr__input-string'}
                            value={this.state.customValue === null ? '' : this.state.customValue}
                            onBlur={this.onCustomInputBlur}
                            onChange={(e) => this.setState({ customValue: e.target.value })}
                            ref={this.customInputRef}
                        />
                    </div>
                )}
            </div>
        );
    }
}

export default withTranslation()(InputCheckbox) as React.FunctionComponent<InputCheckboxProps<any, any, any, any>>;
