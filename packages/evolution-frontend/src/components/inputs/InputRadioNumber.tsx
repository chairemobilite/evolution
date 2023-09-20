/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { ChangeEventHandler, ReactElement, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { InputRadioNumberType } from 'evolution-common/lib/services/widgets';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { withTranslation, WithTranslation } from 'react-i18next';

type InputRadioNumberProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    id: string;
    onValueChange: (e: any, customValue?: string) => void;
    value?: number;
    widgetConfig: InputRadioNumberType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    path: string;
    user: CliUser;
};

type InputRadioChoiceProps = {
    id?: string;
    value: number;
    name: string;
    selected?: boolean;
    icon?: IconProp;
    inputIconPath?: { iconPath: string; iconSize: string };
    onChange: ChangeEventHandler<HTMLInputElement>;
};

const InputRadioNumberChoice = ({
    id,
    value,
    name,
    selected,
    icon,
    inputIconPath,
    onChange
}: InputRadioChoiceProps) => {
    const inputRadioRef: React.RefObject<HTMLInputElement> = React.createRef();
    return (
        <div className={'survey-question__input-radio-input-container'}>
            <div className="label-input-container">
                <input
                    type="radio"
                    checked={selected}
                    id={id}
                    name={name}
                    className={'input-radio'}
                    value={value}
                    onChange={onChange}
                    ref={inputRadioRef}
                />
                <label htmlFor={id}>
                    {icon && (
                        <span>
                            <FontAwesomeIcon icon={icon} className="faIconLeft" style={{ margin: 'auto 0' }} />
                        </span>
                    )}
                    {inputIconPath && (
                        <span>
                            <img
                                src={inputIconPath.iconPath}
                                className="faIconLeft"
                                style={{ height: inputIconPath.iconSize, margin: '0 0.25em 0 0' }}
                                alt={`${value}`}
                            />
                        </span>
                    )}
                    <span>{value}</span>
                </label>
            </div>
        </div>
    );
};

export const InputRadioNumber = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>({
    id,
    onValueChange,
    value,
    widgetConfig,
    interview,
    path,
    user,
    t
}: InputRadioNumberProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation) => {
    const minValue = surveyHelper.parseInteger(widgetConfig.valueRange.min, interview, path, user) || 0;
    const maxValue = surveyHelper.parseInteger(widgetConfig.valueRange.max, interview, path, user) || minValue + 1;
    const [currentValue, setCurrentValue] = useState(!_isBlank(value) ? Number(value) : -1);
    const [isOverMax, setIsOverMax] = useState(Number(value) > maxValue);

    const handleOnChange = (event) => {
        // "blur" is the event triggered when the input loses focus.
        // When this happens, if the text field contains "" (an empty string), then the text box is left empty
        // and it's not clear what is the true value recorded by the widget. Therefore, if the event is 'blur',
        // we change the value of the widget to "" to make it appear unanswered.
        if (event.type !== 'blur' && event.target.value === '') {
            return;
        }
        setCurrentValue(Number(event.target.value));
        onValueChange(event, Number(event.target.value).toString());
        Number(event.target.value) <= maxValue ? setIsOverMax(false) : setIsOverMax(true);
    };
    const choiceBuilder = (
        min: number,
        max: number,
        onChange: ChangeEventHandler<HTMLInputElement>,
        inputIconPath?: { iconPath: string; iconSize: string }
    ) => {
        const choiceList: ReactElement[] = [];

        for (let i = min; i <= max; i += 1) {
            choiceList.push(
                <InputRadioNumberChoice
                    selected={currentValue === i}
                    key={`${id}_${i}`}
                    id={`${id}_${i}`}
                    name={`inputChoice_${id}`}
                    value={i}
                    icon={widgetConfig.icon}
                    inputIconPath={inputIconPath}
                    onChange={handleOnChange}
                />
            );
        }
        return choiceList;
    };

    return (
        <div
            className={`survey-question__input-radio-group-container${
                widgetConfig.sameLine === false ? ' no-wrap' : ''
            }`}
        >
            {choiceBuilder(minValue, maxValue, handleOnChange, widgetConfig.inputIconPath)}
            {widgetConfig.overMaxAllowed && (
                <>
                    <div className={'survey-question__input-radio-input-container'}>
                        <div className="label-input-container">
                            <input
                                type="radio"
                                id={`${id}_${maxValue + 1}`}
                                name={`inputChoice_${id}`}
                                checked={Number(value) > maxValue}
                                value={maxValue + 1}
                                className={'input-radio'}
                                onChange={handleOnChange}
                            />
                            <label htmlFor={`${id}_${maxValue + 1}`}>{`${maxValue + 1}+`}</label>
                        </div>
                    </div>
                    {isOverMax && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label htmlFor={`${id}over-max`}>
                                <span>{t(['survey:SpecifyAboveLimit', 'main:SpecifyAboveLimit']) + ':'}</span>
                            </label>
                            <input
                                autoFocus
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

export default withTranslation()(InputRadioNumber) as React.FunctionComponent<
    InputRadioNumberProps<any, any, any, any>
>;
