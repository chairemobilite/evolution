/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { ReactElement, useEffect, useState } from 'react';
import { InputRadioNumberType, RadioChoiceType } from 'evolution-common/lib/services/questionnaire/types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { useTranslation } from 'react-i18next';
import { InputRadioChoiceT } from './InputRadio';

type InputRadioNumberProps = {
    id: string;
    onValueChange: (e: any, customValue?: string) => void;
    value?: number | string | boolean;
    widgetConfig: InputRadioNumberType;
    interview: UserInterviewAttributes;
    path: string;
    user: CliUser;
};

export const InputRadioNumber = ({
    id,
    onValueChange,
    value,
    widgetConfig,
    interview,
    path,
    user
}: InputRadioNumberProps) => {
    const { t } = useTranslation();
    const minValue = surveyHelper.parseInteger(widgetConfig.valueRange.min, interview, path, user) || 0;
    const maxValue = surveyHelper.parseInteger(widgetConfig.valueRange.max, interview, path, user) || minValue + 1;
    const additionalChoices = widgetConfig.additionalChoices
        ? typeof widgetConfig.additionalChoices === 'function'
            ? widgetConfig.additionalChoices(interview, path)
            : widgetConfig.additionalChoices
        : [];
    const visibleAdditionalChoices = additionalChoices
        .filter((choice) => surveyHelper.parseBoolean(choice.conditional, interview, path, user))
        .filter((choice) => choice.hidden !== true);
    const numericValue =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
                ? Number(value)
                : undefined;
    const selectedAdditionalChoice = visibleAdditionalChoices.find((choice) => choice.value === value);
    const selectedValue = numericValue ?? selectedAdditionalChoice?.value;
    const [currentValue, setCurrentValue] = useState<number | string | boolean | undefined>(selectedValue);
    const [isOverMax, setIsOverMax] = useState(numericValue !== undefined && numericValue > maxValue);
    // Value of the text input, to make the input controlled instead of
    // uncontrolled since the value received as props may change.
    const [inputValue, setInputValue] = useState('');
    const customInputRadioRef: React.RefObject<HTMLInputElement | null> = React.createRef();

    useEffect(() => {
        setCurrentValue(selectedValue);
        setIsOverMax(numericValue !== undefined && numericValue > maxValue);
    }, [selectedValue, numericValue, maxValue]);

    // Set the inputValue to the current numeric value. If the input is not to
    // be displayed, it will be ignored
    useEffect(() => {
        setInputValue(typeof currentValue === 'number' ? String(currentValue) : '');
    }, [currentValue]);

    const handleOnChange = (event) => {
        // "blur" is the event triggered when the input loses focus.
        // When this happens, if the text field contains "" (an empty string), then the text box is left empty
        // and it's not clear what is the true value recorded by the widget. Therefore, if the event is 'blur',
        // we change the value of the widget to `undefined` to make it appear unanswered.
        if (event.type !== 'blur' && event.target.value === '') {
            return;
        }
        const newCurrentValue = event.target.value === '' ? undefined : Number(event.target.value);
        setCurrentValue(newCurrentValue === undefined ? -1 : newCurrentValue);
        // FIXME onValueChange in the Question should not have to receive the
        // event itself or its structure. InputDatePicker already does not send
        // the target.value.  We should type and document it. Here we are
        // recreating the part of interest of the event so that unit test can
        // pass (because events are being re-used and validating its content
        // later does not work as it has been changed).
        onValueChange({ target: { value: newCurrentValue } });
        if (newCurrentValue !== undefined && newCurrentValue > maxValue) {
            setIsOverMax(true);
        } else {
            setIsOverMax(false);
        }
    };

    // TODO: The three functions below are copied from InputRadio.tsx.
    // Ideally we would not repeat code like this.
    const onRadioClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const onLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const onAdditionalChoiceChange = (choice: RadioChoiceType) => {
        setCurrentValue(choice.value);
        setIsOverMax(false);
        onValueChange({ target: { value: choice.value } });
    };

    const onContainerClick = (
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
            customInputRadioRef.current?.dispatchEvent(clickEvent);
        }
    };

    const choiceList: ReactElement[] = [];

    for (let i = minValue; i <= maxValue; i += 1) {
        const choice = {
            value: i,
            label: i.toString(),
            icon: widgetConfig.icon,
            inputIconPath: widgetConfig.inputIconPath
        };
        choiceList.push(
            <InputRadioChoiceT
                checked={currentValue === i}
                key={`${id}_${i}`}
                id={`${id}_${i}`}
                choice={choice as any}
                iconSize={widgetConfig.inputIconPath?.iconSize || '2em'}
                path={path}
                user={user}
                interview={interview as any}
                onRadioInputChange={handleOnChange}
                onRadioClick={onRadioClick}
                onContainerClick={onContainerClick}
                onLabelClick={onLabelClick}
            />
        );
    }

    const additionalChoiceInputs = visibleAdditionalChoices.map((choice) => (
        <InputRadioChoiceT
            checked={currentValue === choice.value}
            key={`${id}_${choice.value}`}
            id={`${id}_${choice.value}`}
            choice={choice}
            iconSize={widgetConfig.inputIconPath?.iconSize || '2em'}
            path={path}
            user={user}
            interview={interview}
            onRadioInputChange={() => onAdditionalChoiceChange(choice)}
            onRadioClick={onRadioClick}
            onContainerClick={onContainerClick}
            onLabelClick={onLabelClick}
        />
    ));

    const overMaxChoice = {
        value: maxValue + 1,
        label: `${maxValue + 1}+`,
        icon: widgetConfig.icon,
        inputIconPath: widgetConfig.inputIconPath
    };
    return (
        <div
            className={`survey-question__input-radio-group-container${
                widgetConfig.sameLine === false ? ' no-wrap' : ''
            }`}
        >
            {choiceList}
            {widgetConfig.overMaxAllowed && (
                <>
                    <InputRadioChoiceT
                        checked={typeof currentValue === 'number' && currentValue > maxValue}
                        key={`${id}_${maxValue + 1}`}
                        id={`${id}_${maxValue + 1}`}
                        choice={overMaxChoice as any}
                        iconSize={widgetConfig.inputIconPath?.iconSize || '2em'}
                        path={path}
                        user={user}
                        interview={interview as any}
                        onRadioInputChange={handleOnChange}
                        onRadioClick={onRadioClick}
                        onContainerClick={onContainerClick}
                        onLabelClick={onLabelClick}
                    />
                    {isOverMax && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label htmlFor={`${id}over-max`}>
                                <span>{t(['survey:SpecifyAboveLimit', 'main:SpecifyAboveLimit']) + ':'}</span>
                            </label>
                            <input
                                type="number"
                                pattern="[0-9]*"
                                className={`apptr__form-input apptr__input-string input-${
                                    widgetConfig.iconSize || 'large'
                                }`}
                                style={{ width: '6rem' }}
                                name={`${id}over-max`}
                                id={`${id}over-max`}
                                value={inputValue}
                                onChange={(event) => setInputValue(event.target.value)}
                                min={maxValue + 1}
                                onBlur={handleOnChange}
                                onMouseUp={handleOnChange}
                            />
                        </div>
                    )}
                </>
            )}
            {additionalChoiceInputs}
        </div>
    );
};

export default InputRadioNumber;
