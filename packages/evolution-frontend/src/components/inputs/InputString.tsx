/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputStringType } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { CommonInputProps } from './CommonInputProps';
import FormattedInput from './FormattedInput';

export type InputStringProps = CommonInputProps & {
    value?: string;
    inputRef?: React.LegacyRef<HTMLInputElement>;
    widgetConfig: InputStringType;
    updateKey: number;
};

const getStateValue = (props: InputStringProps) => {
    const value = _isBlank(props.value)
        ? surveyHelper.parseString(props.widgetConfig.defaultValue, props.interview, props.path, props.user)
        : props.value;
    return _isBlank(value) ? '' : value;
};

export const InputString = (props: InputStringProps) => {
    const { i18n } = useTranslation();
    const [value, setValue] = React.useState(getStateValue(props));
    const inputRef = React.useRef<HTMLInputElement>(props.inputRef || (null as any));

    // Update the value with props when updateKey prop is updated. Not using the
    // `key` to avoid loosing the identity of the component (which causes the
    // focus to get lost)
    React.useEffect(() => {
        setValue(getStateValue(props));
    }, [props.updateKey]);

    const handleChange = (newValue: string) => {
        setValue(newValue);
    };

    // Common input props
    const inputProps = {
        type: 'text',
        id: props.id,
        name: props.id,
        value,
        onBlur: props.onValueChange,
        placeholder: props.widgetConfig.placeholder,
        inputMode: props.widgetConfig.keyboardInputMode,
        className: `apptr__form-input apptr__input-string input-${props.widgetConfig.size || 'large'}`,
        maxLength: props.widgetConfig.maxLength ? props.widgetConfig.maxLength : 255,
        style: { textTransform: props.widgetConfig.textTransform || ('none' as any) },
        autoComplete: 'none'
    };

    // Translate the suffix label
    const suffixLabel = surveyHelper.translateString(
        props.widgetConfig.suffixLabel,
        i18n,
        props.interview,
        props.path,
        props.user
    );

    // If the inputFilter is defined, use the formatted input, otherwise use the regular input
    const inputEl = _isBlank(props.widgetConfig.inputFilter) ? (
        <input {...inputProps} onChange={(e) => handleChange(e.target.value)} ref={inputRef} />
    ) : (
        <FormattedInput
            {...inputProps}
            onChange={handleChange}
            formatValue={props.widgetConfig.inputFilter}
            inputRef={inputRef}
        />
    );

    // If the suffixLabel is defined, add it to the input element otherwise return the input element
    return _isBlank(suffixLabel) ? (
        inputEl
    ) : (
        <div className="apptr__input-with-suffix">
            {inputEl}
            <span className="apptr__input-suffix">{suffixLabel}</span>
        </div>
    );
};

export default InputString;
