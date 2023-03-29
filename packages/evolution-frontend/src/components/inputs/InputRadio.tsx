/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { shuffle } from 'chaire-lib-common/lib/utils/RandomUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { _chunkify } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { InputRadioType, RadioChoiceType } from 'evolution-common/lib/services/widgets';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

export interface InputRadioProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    onValueChange: (e: any, customValue?: string) => void;
    value: string | boolean;
    /** Value of the custom field if 'other' is selected */
    customValue?: string;
    // FIXME: customPath and customChoice are not part of checkbox, otherwise very similar to this one. Can they be treated the same? How does checkbox handle customPath?
    customPath?: string;
    customChoice?: string;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
    inputRef?: React.LegacyRef<HTMLTextAreaElement>;
    size?: 'small' | 'medium' | 'large';
    widgetConfig: InputRadioType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO Document, what is this? Also, the presence of this props, that comes as a prop of question, is related to the presence of a customLabel, in the widgetConfig, what's the relation between those 2??
    customId?: string;
}

interface InputRadioState {
    customValue: string;
}

interface InputRadioChoiceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    choice: RadioChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    checked: boolean;
    iconSize: string;
    children?: React.ReactNode;
    onRadioInputChange: React.ChangeEventHandler;
    onLabelClick: React.MouseEventHandler;
    onRadioClick: React.MouseEventHandler;
    onContainerClick: (
        inputRadioRef: React.RefObject<HTMLInputElement>,
        value: string | boolean,
        e: React.MouseEvent<HTMLDivElement>
    ) => void;
}

const InputRadioChoice = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputRadioChoiceProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    const id = `${props.id}__input-radio__${props.choice.value}`;
    const strValue =
        props.choice.value !== null && props.choice.value !== undefined
            ? props.choice.value.toString()
            : props.choice.value;
    const strLabel = surveyHelper.parseString(
        props.choice.label[props.i18n.language] || props.choice.label,
        props.interview,
        props.path
    );
    const inputRadioRef: React.RefObject<HTMLInputElement> = React.createRef();
    const iconPath = props.choice.iconPath
        ? surveyHelper.parseString(props.choice.iconPath, props.interview, props.path)
        : null;
    return (
        <div
            onClick={(e) => {
                props.onContainerClick(inputRadioRef, props.choice.value, e);
            }}
            className={`survey-question__input-radio-input-container${props.checked ? ' checked' : ''}`}
        >
            <div className="label-input-container">
                <input
                    type="radio"
                    id={id}
                    name={props.id}
                    className={'input-radio'}
                    value={strValue}
                    checked={props.checked}
                    onChange={props.onRadioInputChange}
                    onClick={props.onRadioClick}
                    ref={inputRadioRef}
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
                    <span>{strLabel}</span>
                </label>
            </div>
            {props.children}
        </div>
    );
};

const InputRadioChoiceT = withTranslation()(InputRadioChoice) as React.FunctionComponent<
    InputRadioChoiceProps<any, any, any, any>
>;

export class InputRadio<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> extends React.Component<
    InputRadioProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation,
    InputRadioState
> {
    private customInputRef: React.RefObject<HTMLInputElement> = React.createRef();
    private customInputRadioRef: React.RefObject<HTMLInputElement> = React.createRef();

    constructor(props: InputRadioProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation) {
        super(props);

        this.state = {
            customValue: props.customValue || ''
        };
        this.customInputRef = React.createRef();
        this.customInputRadioRef = React.createRef();
    }

    onContainerClick = (
        inputRadioRef: React.RefObject<HTMLInputElement>,
        value: string | boolean,
        e: React.MouseEvent<HTMLDivElement>
    ) => {
        e.stopPropagation();
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: false
        });
        if (inputRadioRef.current) {
            inputRadioRef.current.dispatchEvent(clickEvent);
        } else {
            // it means the clicked container is the custom one:
            this.customInputRadioRef.current?.dispatchEvent(clickEvent);
        }
    };

    onRadioInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();

        if (this.props.customPath && e.target.value !== this.props.customChoice && this.props.customValue !== null) {
            this.props.onValueChange(e, undefined);
            this.setState(() => ({ customValue: '' }));
        } else {
            this.props.onValueChange(e, this.props.customValue);
        }
    };

    onRadioClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    onLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    onCustomInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        this.props.onValueChange({ target: { value: this.props.customChoice } }, e.target.value);
    };

    onCustomInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (this.props.customChoice !== this.props.value) {
            // trigger change on custom choice radio button:
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: false
            });
            this.customInputRadioRef.current?.dispatchEvent(clickEvent);
        }
    };

    private getColumnedChoices = (choiceInputs: JSX.Element[]): JSX.Element[] => {
        if (this.props.widgetConfig.columns === undefined || this.props.widgetConfig.columns <= 0) {
            return choiceInputs;
        }
        // Chunkify the input choices in columns
        const widgetsByColumn = _chunkify(choiceInputs, this.props.widgetConfig.columns, true);
        const columnedChoiceInputs: JSX.Element[] = [];
        for (let i = 0, count = widgetsByColumn.length; i < count; i++) {
            const columnWidgets = widgetsByColumn[i];
            columnedChoiceInputs.push(
                <div className="survey-question__input-radio-group-column" key={i}>
                    {columnWidgets}
                </div>
            );
        }
        return columnedChoiceInputs;
    };

    render() {
        const widgetChoices = this.props.widgetConfig.choices;
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
                <InputRadioChoiceT
                    choice={choice as any}
                    id={`${this.props.id}_${choice.value}`}
                    key={`${this.props.id}__${choice.value}__key`}
                    interview={this.props.interview}
                    path={this.props.path}
                    checked={choice.value === this.props.value}
                    iconSize={iconSize}
                    onRadioClick={this.onRadioClick}
                    onRadioInputChange={this.onRadioInputChange}
                    onContainerClick={this.onContainerClick}
                    onLabelClick={this.onLabelClick}
                >
                    {choice.value === this.props.customChoice && (
                        <input
                            type="text"
                            tabIndex={-1}
                            autoComplete="none"
                            id={this.props.customId}
                            name={this.props.customId}
                            className={'apptr__form-input input-custom apptr__input-string'}
                            value={this.state.customValue === null ? '' : this.state.customValue}
                            onBlur={this.onCustomInputBlur}
                            onFocus={this.onCustomInputFocus}
                            onChange={(e) => this.setState({ customValue: e.target.value })}
                            ref={this.customInputRef}
                        />
                    )}
                </InputRadioChoiceT>
            ));

        // separate by columns if needed:
        const columnedChoiceInputs = this.getColumnedChoices(choiceInputs);

        return (
            <div
                className={`survey-question__input-radio-group-container${
                    this.props.widgetConfig.sameLine === false ? ' no-wrap' : ''
                }`}
            >
                {columnedChoiceInputs}
            </div>
        );
    }
}

export default withTranslation()(InputRadio);
