/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/components/slider/slider.js';
import type WaSliderElement from '@awesome.me/webawesome/dist/components/slider/slider.js';
import { useTranslation } from 'react-i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputRangeType } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { CommonInputProps } from './CommonInputProps';
import InputCheckbox from 'chaire-lib-frontend/lib/components/input/InputCheckbox';

export type InputRangeProps = CommonInputProps & {
    value?: number | 'na';
    inputRef?: React.Ref<WaSliderElement>;
    widgetConfig: InputRangeType;
};

const setSliderRef = (
    element: WaSliderElement | null,
    inputRef: InputRangeProps['inputRef'],
    trackClassName: string | undefined,
    valueFormatter?: (value: number, lang: string) => string,
    language?: string
) => {
    if (typeof inputRef === 'function') {
        inputRef(element);
    } else if (inputRef) {
        (inputRef as React.MutableRefObject<WaSliderElement | null>).current = element;
    }

    if (!element) {
        return;
    }

    if (trackClassName) {
        element.classList.add(trackClassName, 'survey-question__input-range_slider--colored');
    }

    element.valueFormatter =
        valueFormatter !== undefined ? (value) => valueFormatter(value, language || 'en') : (value) => String(value);
};

export const InputRange = (props: InputRangeProps) => {
    const [value, setValue] = React.useState<number | undefined | 'na'>(props.value);
    const { t, i18n } = useTranslation();

    const labels = props.widgetConfig.labels;
    const formatLabelFct = props.widgetConfig.formatLabel;

    const maxValue: number = !_isBlank(props.widgetConfig.maxValue) ? props.widgetConfig.maxValue || 100 : 100;
    const minValue: number = !_isBlank(props.widgetConfig.minValue) ? props.widgetConfig.minValue || 0 : 0;
    const sliderValue = typeof value === 'number' && value >= minValue ? value : minValue;
    const isDisabled = typeof value === 'string';
    const trackClassName = props.widgetConfig.trackClassName;

    const handleInput = (event: Event) => {
        setValue((event.target as WaSliderElement).value);
    };

    const handleChange = (event: Event) => {
        const newValue = (event.target as WaSliderElement).value;
        if (typeof newValue === 'number' && newValue < minValue) {
            props.onValueChange({ target: { value: null } });
        } else {
            props.onValueChange({ target: { value: newValue } });
        }
    };

    const referenceLabels = labels
        ? labels.map((label, idx) => {
            const labelStr = surveyHelper.translateString(label, i18n, props.interview, props.path, props.user);
            return (
                <span key={`inputRange_${props.id}_label_${idx}`} slot="reference">
                    {labelStr}
                </span>
            );
        })
        : [];

    return (
        <div
            className={`survey-question__input-range_input_container_with_labels${
                _isBlank(value) ? ' input-blank' : ''
            }`}
        >
            {props.widgetConfig.includeNotApplicable === true && (
                <InputCheckbox
                    id={`${props.id}_na`}
                    onValueChange={(newVal) => {
                        if (newVal.target.value.length > 0) {
                            setValue('na');
                            props.onValueChange({ target: { value: 'na' } });
                        } else {
                            setValue(undefined);
                            props.onValueChange({ target: { value: undefined } });
                        }
                    }}
                    value={(value as any) === 'na' ? ['na'] : ([] as any)}
                    choices={[
                        {
                            value: 'na',
                            label:
                                surveyHelper.translateString(
                                    props.widgetConfig.notApplicableLabel,
                                    i18n,
                                    props.interview,
                                    props.path,
                                    props.user
                                ) || t(['survey:main:NotApplicable', 'main:NotApplicable'])
                        }
                    ]}
                />
            )}

            <wa-slider
                ref={(element) => setSliderRef(element, props.inputRef, trackClassName, formatLabelFct, i18n.language)}
                name={props.id}
                min={minValue}
                max={maxValue}
                value={sliderValue}
                indicatorOffset={minValue}
                disabled={isDisabled}
                withTooltip={true}
                aria-labelledby={`${props.id}_label`}
                className={[
                    'survey-question__input-range_slider',
                    trackClassName && 'survey-question__input-range_slider--colored',
                    trackClassName
                ]
                    .filter(Boolean)
                    .join(' ')}
                onInput={handleInput}
                onChange={handleChange}
            >
                {referenceLabels}
            </wa-slider>
        </div>
    );
};

export default InputRange;
