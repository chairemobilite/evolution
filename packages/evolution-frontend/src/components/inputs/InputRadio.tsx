/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { JSX } from 'react';
import DOMPurify from 'dompurify';
import { WithTranslation, withTranslation } from 'react-i18next';
import { shuffle } from 'chaire-lib-common/lib/utils/RandomUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { InputRadioType, RadioChoiceType } from 'evolution-common/lib/services/questionnaire/types';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { CommonInputProps } from './CommonInputProps';
import { sortByParameters } from './InputChoiceSorting';

export type InputRadioProps = CommonInputProps & {
    value: string | boolean;
    /** Value of the custom field if 'other' is selected */
    customValue?: string;
    // FIXME: customPath and customChoice are not part of checkbox, otherwise very similar to this one. Can they be treated the same? How does checkbox handle customPath?
    customPath?: string;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputRadioType;
    // TODO Document, what is this? Also, the presence of this props, that comes as a prop of question, is related to the presence of a customLabel, in the widgetConfig, what's the relation between those 2??
    customId?: string;
};

interface InputRadioState {
    customValue: string;
}

interface InputRadioChoiceProps {
    id: string;
    choice: RadioChoiceType;
    interview: UserInterviewAttributes;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
    checked: boolean;
    iconSize: string;
    children?: React.ReactNode;
    onRadioInputChange: React.ChangeEventHandler;
    onLabelClick: React.MouseEventHandler;
    onRadioClick: React.MouseEventHandler;
    onContainerClick: (
        inputRadioRef: React.RefObject<HTMLInputElement | null>,
        value: string | boolean,
        e: React.MouseEvent<HTMLDivElement>
    ) => void;
}

const InputRadioChoice = (props: InputRadioChoiceProps & WithTranslation) => {
    const id = `${props.id}__input-radio__${props.choice.value}`;
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
    const inputRadioRef: React.RefObject<HTMLInputElement | null> = React.createRef();
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
                    <span dangerouslySetInnerHTML={{ __html: strLabel ? DOMPurify.sanitize(strLabel) : '' }} />
                </label>
            </div>
            {props.children}
        </div>
    );
};

export const InputRadioChoiceT = withTranslation()(InputRadioChoice) as React.FunctionComponent<InputRadioChoiceProps>;

export class InputRadio extends React.Component<InputRadioProps & WithTranslation, InputRadioState> {
    private customInputRef: React.RefObject<HTMLInputElement | null> = React.createRef();
    private customInputRadioRef: React.RefObject<HTMLInputElement | null> = React.createRef();

    constructor(props: InputRadioProps & WithTranslation) {
        super(props);

        this.state = {
            customValue: props.customValue || ''
        };
        this.customInputRef = React.createRef();
        this.customInputRadioRef = React.createRef();
    }

    onContainerClick = (
        inputRadioRef: React.RefObject<HTMLInputElement | null>,
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

        if (
            this.props.customPath &&
            e.target.value !== this.props.widgetConfig.customChoice &&
            this.props.customValue !== null
        ) {
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
        this.props.onValueChange({ target: { value: this.props.widgetConfig.customChoice } }, e.target.value);
    };

    onCustomInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (this.props.widgetConfig.customChoice !== this.props.value) {
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
                    user={this.props.user}
                    checked={choice.value === this.props.value}
                    iconSize={iconSize}
                    onRadioClick={this.onRadioClick}
                    onRadioInputChange={this.onRadioInputChange}
                    onContainerClick={this.onContainerClick}
                    onLabelClick={this.onLabelClick}
                >
                    {choice.value === this.props.widgetConfig.customChoice && (
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
