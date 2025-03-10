/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Note: This file includes types for all the different input and widgets types used in the evolution-generator

import {
    BaseQuestionType,
    ButtonWidgetConfig,
    GroupConfig,
    InfoMapWidgetConfig,
    InputCheckboxType,
    InputDatePickerType,
    InputMapFindPlaceType,
    InputMultiselectType,
    InputRadioNumberType,
    InputRadioType,
    InputRangeType,
    InputSelectType,
    InputStringType,
    InputTextType,
    TextWidgetConfig
} from 'evolution-common/lib/services/questionnaire/types';

// TODO: Add some missing types for the different input types

/* InputRadio widgetConfig Type */
export type InputRadio = BaseQuestionType & InputRadioType;

/* InputRadioNumber widgetConfig Type */
export type InputRadioNumber = BaseQuestionType & InputRadioNumberType;

/* InputString widgetConfig Type */
export type InputString = BaseQuestionType & InputStringType;

/* Text widgetConfig Type */
export type InfoText = TextWidgetConfig;

/* InputRange widgetConfig Type */
export type InputRangeConfig = Pick<
    InputRangeType,
    'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'
>;
export type InputRange = BaseQuestionType & InputRangeType;

/* InputCheckbox widgetConfig Type */
export type InputCheckbox = BaseQuestionType & InputCheckboxType;

/* InputSelect widgetConfig Type */
export type InputSelect = BaseQuestionType & InputSelectType;

/* InputMultiselect widgetConfig Type */
export type InputMultiselect = BaseQuestionType & InputMultiselectType;

/* InputButton widgetConfig Type */
export type InputButton = ButtonWidgetConfig;

/* InputText widgetConfig Type */
export type Text = BaseQuestionType & InputTextType;

/* Group type */
export type Group = GroupConfig;

/* InputMapFindPlace widgetConfig Type */
export type InputMapFindPlace = BaseQuestionType & InputMapFindPlaceType;

/* InfoMap widgetConfig Type */
export type InfoMap = InfoMapWidgetConfig;

/* InputDatePicker widgetConfig Type */
export type InputDatePicker = BaseQuestionType & InputDatePickerType;
