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

type InputRadioNumberProps = {
    id: string;
    onValueChange: (e: any, customValue?: string) => void;
    value?: number;
    widgetConfig: InputRadioNumberType;
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

export const InputRadioNumber = ({ id, onValueChange, value, widgetConfig }: InputRadioNumberProps) => {
    const [currentValue, setCurrentValue] = useState(!_isBlank(value) ? Number(value) : -1);
    const [isOverMax, setIsOverMax] = useState(Number(value) > widgetConfig.valueRange.max);

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentValue(Number(event.target.value));
        onValueChange(event, Number(event.target.value).toString());
        Number(event.target.value) <= widgetConfig.valueRange.max ? setIsOverMax(false) : setIsOverMax(true);
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
        <div className={'survey-question__input-radio-group-container'}>
            {choiceBuilder(
                widgetConfig.valueRange.min,
                widgetConfig.valueRange.max,
                handleOnChange,
                widgetConfig.inputIconPath
            )}
            {widgetConfig.overMaxAllowed && (
                <>
                    <div className={'survey-question__input-radio-input-container'}>
                        <div className="label-input-container">
                            <input
                                type="radio"
                                id={`${id}_${widgetConfig.valueRange.max + 1}`}
                                aria-label={'number input'}
                                name={`inputChoice_${id}`}
                                checked={Number(value) > widgetConfig.valueRange.max}
                                value={widgetConfig.valueRange.max + 1}
                                className={'input-radio'}
                                onChange={handleOnChange}
                            />
                            <label htmlFor={`${id}_${widgetConfig.valueRange.max + 1}`}>{`${
                                widgetConfig.valueRange.max + 1
                            } +`}</label>
                        </div>
                    </div>
                    {isOverMax && (
                        <input
                            type="number"
                            className={`apptr__form-input apptr__input-string input-${
                                widgetConfig.iconSize || 'large'
                            }`}
                            name={`${id}over-max`}
                            id={`${id}over-max`}
                            defaultValue={currentValue}
                            min={widgetConfig.valueRange.max + 1}
                            onChange={handleOnChange}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default InputRadioNumber;
