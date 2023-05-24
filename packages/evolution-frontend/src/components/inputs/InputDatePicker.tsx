/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
// TODO this package hasn't been updated in a while. Consider changing for a more maintained one
import DatePicker, { registerLocale } from 'react-datepicker';
import { withTranslation, WithTranslation } from 'react-i18next';
import fr from 'date-fns/locale/fr';
import enCA from 'date-fns/locale/en-CA';
import 'react-datepicker/dist/react-datepicker.css';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InputDatePickerType } from 'evolution-common/lib/services/widgets';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

export interface InputDatePickerProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    id: string;
    onValueChange: (e: any) => void;
    value?: string;
    inputRef?: React.LegacyRef<DatePicker>;
    widgetConfig: InputDatePickerType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    // TODO There's also a path in widgetConfig, but this one comes from the props of the question. See if it's always the same and use the one from widgetConfig if necessary
    path: string;
    user: CliUser;
}

export const InputDatePicker = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    props: InputDatePickerProps<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & WithTranslation
) => {
    const maxDate = surveyHelper.parse(props.widgetConfig.maxDate, props.interview, props.path, props.user);
    const minDate = surveyHelper.parse(props.widgetConfig.minDate, props.interview, props.path, props.user);
    if (
        props.widgetConfig.locale &&
        (props.widgetConfig.locale[props.i18n.language] === 'fr' ||
            props.widgetConfig.locale[props.i18n.language] === 'en-CA')
    ) {
        registerLocale('fr', fr);
        registerLocale('en-CA', enCA);
    }

    return (
        <div className="survey-question__input-date-picker-container">
            <DatePicker
                autoComplete="none"
                className={`apptr__form-input input-date-picker input-${props.widgetConfig.size || 'large'}`}
                name={props.id}
                id={props.id}
                ref={props.inputRef}
                showTimeSelect={props.widgetConfig.showTimeSelect ? true : false}
                dateFormat={props.widgetConfig.showTimeSelect ? 'dd/MM/yyyy h:mm aa' : 'dd/MM/yyyy'}
                minDate={minDate ? minDate : null}
                maxDate={maxDate ? maxDate : null}
                locale={
                    props.widgetConfig.locale && props.widgetConfig.locale[props.i18n.language]
                        ? props.widgetConfig.locale[props.i18n.language]
                        : undefined
                }
                placeholderText={
                    props.widgetConfig.placeholderText
                        ? surveyHelper.translateString(
                            props.widgetConfig.placeholderText,
                            props.i18n,
                            props.interview,
                            props.path
                        )
                        : props.t('main:ClickToSelectDate')
                }
                selected={props.value !== undefined ? new Date(props.value) : undefined}
                onChange={(date) => props.onValueChange({ target: { value: date } })}
            />
        </div>
    );
};

export default withTranslation()(InputDatePicker) as React.FunctionComponent<InputDatePickerProps<any, any, any, any>>;
