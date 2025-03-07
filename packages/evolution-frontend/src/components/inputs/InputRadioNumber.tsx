/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { ReactElement, useState } from 'react';
import { InputRadioNumberType } from 'evolution-common/lib/services/questionnaire/types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { withTranslation, WithTranslation } from 'react-i18next';
import { InputRadioChoiceT } from './InputRadio';

type InputRadioNumberProps = {
    id: string;
    onValueChange: (e: any, customValue?: string) => void;
    value?: number;
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
    user,
    t
}: InputRadioNumberProps & WithTranslation) => {
    const minValue = surveyHelper.parseInteger(widgetConfig.valueRange.min, interview, path, user) || 0;
    const maxValue = surveyHelper.parseInteger(widgetConfig.valueRange.max, interview, path, user) || minValue + 1;
    const [currentValue, setCurrentValue] = useState(!_isBlank(value) ? Number(value) : -1);
    const [isOverMax, setIsOverMax] = useState(Number(value) > maxValue);
    const customInputRadioRef: React.RefObject<HTMLInputElement | null> = React.createRef();

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
                        checked={Number(value) > maxValue}
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
                                defaultValue={currentValue}
                                min={maxValue + 1}
                                onBlur={handleOnChange}
                                onMouseUp={handleOnChange}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default withTranslation()(InputRadioNumber);
