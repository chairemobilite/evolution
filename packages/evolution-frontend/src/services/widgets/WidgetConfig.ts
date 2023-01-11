/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO As code migrates to typescript, those types will evolve

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { ParsingFunction } from '../../utils/helpers';

type LangData = {
    [lang: string]: string | ((interview: UserInterviewAttributes) => string);
};

export type InputStringType = {
    inputType: 'string';
    defaultValue?: string | ParsingFunction<string>;
    maxLength?: number;
    datatype?: 'string' | 'integer' | 'float';
};

export type InputTextType = {
    inputType: 'text';
    defaultValue?: string | ParsingFunction<string>;
    maxLength?: number;
    shortname?: string;
    rows?: number;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

// TODO This type is used by select, checkbox, radio, buttons etc. See if we can leverage functionality. Now every widget uses a subset of the properties (some may not need some of them, some could use them)
export type ChoiceType = {
    value: string;
    label: string | { [lang: string]: string };
    hidden?: boolean;
    icon?: IconProp;
    iconPath?: string;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
    color?: string;
    size?: 'large' | 'small' | 'medium';
};

export type GroupedChoiceType = {
    groupShortname: string;
    groupLabel: string | { [lang: string]: string };
    choices: ChoiceType[];
};

export const isGroupedChoice = (choice: GroupedChoiceType | ChoiceType): choice is GroupedChoiceType => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (choice as any).groupShortname === 'string';
};

export type InputCheckboxType = {
    inputType: 'checkbox';
    choices: ChoiceType[] | ParsingFunction<ChoiceType[]>;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    columns?: number;
    sameLine?: boolean;
    customLabel?: string | LangData;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

export type InputRadioType = {
    inputType: 'radio';
    choices: ChoiceType[] | ParsingFunction<ChoiceType[]>;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    columns?: number;
    sameLine?: boolean;
    customLabel?: string | LangData;
    customChoice?: string;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

// TODO Could select widget have a custom 'other' field? Like checkbox and radios
export type InputSelectType = {
    inputType: 'select';
    choices: (GroupedChoiceType | ChoiceType)[] | ParsingFunction<(GroupedChoiceType | ChoiceType)[]>;
    // string css style for the icon size, for example '2em'
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

export type InputMultiselectType = {
    inputType: 'multiselect';
    choices: ChoiceType[] | ParsingFunction<ChoiceType[]>;
    // string css style for the icon size, for example '2em'
    datatype?: 'string' | 'integer' | 'float' | 'text';
    multiple?: boolean;
    // TODO What is a shortcut? Is the name right? It looks like a subset of the choices
    shortcuts?: ChoiceType[];
    onlyLabelSearch?: boolean;
    isClearable?: boolean;
    closeMenuOnSelect?: boolean;
};

export type InputButtonType = {
    inputType: 'button';
    choices: ChoiceType[] | ParsingFunction<ChoiceType[]>;
    hideWhenRefreshing?: boolean;
    align?: 'center' | 'left' | 'right';
    isModal?: boolean;
    sameLine?: boolean;
};

export type InputTimeType = {
    inputType: 'time';
    suffixTimes?: ParsingFunction<{ [timeStr: string]: string }>;
    minTimeSecondsSinceMidnight?: number | ParsingFunction<number>;
    maxTimeSecondsSinceMidnight?: number | ParsingFunction<number>;
    minuteStep?: number | ParsingFunction<number>;
    addHourSeparators?: boolean;
};

export type InputRangeType = {
    inputType: 'slider';
    maxValue?: number;
    minValue?: number;
    formatLabel?: (value: number, lang: string) => string;
    labels?: (string | LangData)[];
    trackClassName?: string;
};

export type InputDatePickerType = {
    inputType: 'datePicker';
    showTimeSelect?: boolean;
    placeholderText?: string | LangData;
    maxDate?: Date | ParsingFunction<Date>;
    minDate?: Date | ParsingFunction<Date>;
    locale?: { [languageCode: string]: string };
};

type InputMapType = {
    defaultCenter: { lat: number; lon: number };
    geocodingQueryString?: ParsingFunction<string | undefined>;
    refreshGeocodingLabel?: LangData;
    afterRefreshButtonText?: LangData;
    icon?: {
        url: string | ParsingFunction<string>;
    };
    containsHtml?: boolean;
    maxZoom?: number;
    defaultZoom?: number;
};

export type InputMapPointType = InputMapType & {
    inputType: 'mapPoint';
};

export type InputMapFindPlaceType = InputMapType & {
    inputType: 'mapFindPlace';
    placesIcon?: {
        url: string | ParsingFunction<string>;
    };
    showPhoto?: boolean;
    autoConfirmIfSingleResult?: boolean;
    updateDefaultValueWhenResponded?: boolean;
};

export type WidgetConfig =
    | ({
          type: 'question';
          twoColumns?: boolean;
          path: string;
          containsHtml?: boolean;
          label: LangData;
          helpPopup?: {
              title: LangData;
              content: LangData;
          };
          // FIXME Type when used in typescript (this is complicated)
          validations?: any;
          conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
      } & (
          | InputStringType
          | InputTextType
          | InputCheckboxType
          | InputMultiselectType
          | InputRadioType
          | InputButtonType
          | InputTimeType
          | InputMapPointType
          | InputMapFindPlaceType
          | InputRangeType
          | InputDatePickerType
      ))
    | {
          type: 'text';
          align: 'center';
          text: LangData;
      };
