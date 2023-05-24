/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
// TODO this package hasn't been updated in a while. Consider changing for a more maintained one
import ReactInputRange, { Range } from 'react-input-range';
import { withTranslation, WithTranslation } from 'react-i18next';
import defaultClassNames from 'react-input-range/src/js/input-range/default-class-names';
import 'react-input-range/lib/css/index.css';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputRangeType } from 'evolution-common/lib/services/widgets';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { CommonInputProps } from './CommonInputProps';

export type InputRangeProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = CommonInputProps<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    value?: number;
    inputRef?: React.LegacyRef<ReactInputRange>;
    widgetConfig: InputRangeType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
};

export const InputRange = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputRangeProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    const [value, setValue] = React.useState<number | Range | undefined>(props.value);

    const labels = props.widgetConfig.labels;
    const labelItems = labels
        ? labels.map((label, idx) => {
            const labelStr = surveyHelper.translateString(label, props.i18n, props.interview, props.path, props.user);
            return (
                <p
                    key={`inputRange_${props.id}_label_${idx}`}
                    className={`__input-range_input_container_label${
                        idx > 0 && idx < labels.length - 1
                            ? ' __input-range_input_container_label_middle'
                            : idx === labels.length - 1
                                ? ' __input-range_input_container_label_last'
                                : ''
                    }`}
                >
                    {labelStr}
                </p>
            );
        })
        : [];

    if (props.widgetConfig.trackClassName) {
        defaultClassNames.track = props.widgetConfig.trackClassName;
    }

    const formatLabelFct = props.widgetConfig.formatLabel;

    const maxValue: number = !_isBlank(props.widgetConfig.maxValue) ? props.widgetConfig.maxValue || 100 : 100;
    const minValue: number = !_isBlank(props.widgetConfig.minValue) ? props.widgetConfig.minValue || -10 : -10;

    return (
        <div
            className={`survey-question__input-range_input_container_with_labels${
                _isBlank(value) ? ' input-blank' : ''
            }`}
        >
            <ReactInputRange
                name={props.id}
                // defaultValue = {_isBlank(this.props.value) ? this.props.widgetConfig.defaultValue : this.props.value }
                ref={props.inputRef}
                maxValue={maxValue as number | undefined}
                minValue={minValue as number | undefined}
                formatLabel={
                    formatLabelFct !== undefined
                        ? (value) => formatLabelFct(value, props.i18n.language)
                        : (value) => String(value)
                }
                value={!_isBlank(value) && value !== undefined && value >= minValue ? value : minValue}
                classNames={defaultClassNames}
                onChange={(value) => setValue(value)}
                onChangeComplete={(value) => {
                    if (value < minValue) {
                        props.onValueChange({ target: { value: null } });
                    } else {
                        props.onValueChange({ target: { value } });
                    }
                }}
            />
            {labelItems.length > 0 && (
                <div className={'survey-question__input-range_input_labels_container'}>{labelItems}</div>
            )}
        </div>
    );
};

export default withTranslation()(InputRange) as React.FunctionComponent<InputRangeProps<any, any, any, any>>;
