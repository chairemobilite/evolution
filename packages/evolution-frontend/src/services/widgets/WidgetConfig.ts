/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO As code migrates to typescript, those types will evolve

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
    UserInterviewAttributes,
    InterviewResponsePath,
    InterviewResponses
} from 'evolution-common/lib/services/interviews/interview';
import { ParsingFunction } from '../../utils/helpers';
import { FrontendUser } from 'chaire-lib-frontend/lib/services/auth/user';

/**
 * Validation function, which validates the value with potentially multiple
 * validation functions and return whether the specified error message should be
 * displayed.
 *
 * A validation function will return an array of validation function results and
 * the translated error message to display if true.
 *
 * TODO: Rename `validation` to something that makes it obvious that `true`
 * means there's an error.
 */
export type ValidationFunction<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = (
    value: unknown | undefined,
    customValue: unknown | undefined,
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    path: string,
    customPath?: string,
    user?: FrontendUser
) => { validation: boolean; errorMessage: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> }[];

export type LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    [lang: string]: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
};

export type InputStringType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'string';
    defaultValue?: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    maxLength?: number;
    datatype?: 'string' | 'integer' | 'float';
};

export type InputTextType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'text';
    defaultValue?: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    maxLength?: number;
    shortname?: string;
    rows?: number;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

// TODO This type is used by select, checkbox, radio, buttons etc. See if we can leverage functionality. Now every widget uses a subset of the properties (some may not need some of them, some could use them)
type BaseChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    label: string | { [lang: string]: string };
    hidden?: boolean;
    icon?: IconProp;
    iconPath?: string;
    conditional?: ParsingFunction<
        boolean | [boolean] | [boolean, unknown],
        CustomSurvey,
        CustomHousehold,
        CustomHome,
        CustomPerson
    >;
    color?: string;
    size?: 'large' | 'small' | 'medium';
};
export type ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = BaseChoiceType<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    value: string;
};

export type RadioChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = BaseChoiceType<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    value: string | boolean;
};

export type GroupedChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    groupShortname: string;
    groupLabel: string | { [lang: string]: string };
    choices: ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[];
};

export const isGroupedChoice = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    choice:
        | GroupedChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
        | ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
): choice is GroupedChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (choice as any).groupShortname === 'string';
};

export type InputCheckboxType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'checkbox';
    choices:
        | ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[]
        | ParsingFunction<
              ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    columns?: number;
    sameLine?: boolean;
    customLabel?: string | LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

export type InputRadioType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'radio';
    choices:
        | RadioChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[]
        | ParsingFunction<
              RadioChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    columns?: number;
    sameLine?: boolean;
    customLabel?: string | LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    customChoice?: string;
    datatype?: 'string' | 'integer' | 'float' | 'text' | 'boolean';
};

// TODO Could select widget have a custom 'other' field? Like checkbox and radios
export type InputSelectType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'select';
    choices:
        | (
              | GroupedChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
              | ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          )[]
        | ParsingFunction<
              (
                  | GroupedChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
                  | ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
              )[],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
    // string css style for the icon size, for example '2em'
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

export type InputMultiselectType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'multiselect';
    choices:
        | ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[]
        | ParsingFunction<
              ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
    // string css style for the icon size, for example '2em'
    datatype?: 'string' | 'integer' | 'float' | 'text';
    multiple?: boolean;
    // TODO What is a shortcut? Is the name right? It looks like a subset of the choices
    shortcuts?: ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[];
    onlyLabelSearch?: boolean;
    isClearable?: boolean;
    closeMenuOnSelect?: boolean;
};

export type InputButtonType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'button';
    choices:
        | ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[]
        | ParsingFunction<
              ChoiceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
    hideWhenRefreshing?: boolean;
    align?: 'center' | 'left' | 'right';
    isModal?: boolean;
    sameLine?: boolean;
};

export type InputTimeType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'time';
    suffixTimes?: ParsingFunction<
        { [timeStr: string]: string },
        CustomSurvey,
        CustomHousehold,
        CustomHome,
        CustomPerson
    >;
    minTimeSecondsSinceMidnight?:
        | number
        | ParsingFunction<number, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    maxTimeSecondsSinceMidnight?:
        | number
        | ParsingFunction<number, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    minuteStep?: number | ParsingFunction<number, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    addHourSeparators?: boolean;
};

export type InputRangeType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'slider';
    maxValue?: number;
    minValue?: number;
    formatLabel?: (value: number, lang: string) => string;
    labels?: (string | LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>)[];
    trackClassName?: string;
};

export type InputDatePickerType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'datePicker';
    showTimeSelect?: boolean;
    placeholderText?: string | LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    maxDate?: Date | ParsingFunction<Date, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    minDate?: Date | ParsingFunction<Date, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    locale?: { [languageCode: string]: string };
};

type InputMapType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    defaultCenter: { lat: number; lon: number };
    geocodingQueryString?: ParsingFunction<string | undefined, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    refreshGeocodingLabel?: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    afterRefreshButtonText?: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    icon?: {
        url: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    };
    containsHtml?: boolean;
    maxZoom?: number;
    defaultZoom?: number;
};

export type InputMapPointType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = InputMapType<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    inputType: 'mapPoint';
};

export type InputMapFindPlaceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = InputMapType<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    inputType: 'mapFindPlace';
    placesIcon?: {
        url: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    };
    showPhoto?: boolean;
    autoConfirmIfSingleResult?: boolean;
    updateDefaultValueWhenResponded?: boolean;
};

export type WidgetConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> =
    | ({
          type: 'question';
          twoColumns?: boolean;
          path: InterviewResponsePath<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          containsHtml?: boolean;
          label: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          helpPopup?: {
              title: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
              content: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          };
          validations?: ValidationFunction<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
      } & (
          | InputStringType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputTextType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputCheckboxType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputMultiselectType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputRadioType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputButtonType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputTimeType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputMapPointType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputMapFindPlaceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputRangeType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputDatePickerType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
          | InputSelectType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
      ))
    | {
          type: 'text';
          align: 'center';
          text: LangData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
      }
    | {
          type: 'group';
          path: string;
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
          // TODO Further type this
      }
    | {
          type: 'button';
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
          // TODO Further type this
      }
    | {
          type: 'infoMap';
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
          // TODO Further type this
      };
