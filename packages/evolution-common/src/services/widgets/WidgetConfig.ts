/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO As code migrates to typescript, those types will evolve

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { UserInterviewAttributes, InterviewResponsePath, InterviewResponses } from '../interviews/interview';
import { ParsingFunction, I18nData } from '../../utils/helpers';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

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
    user?: CliUser
) => { validation: boolean; errorMessage: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> }[];

export type InputStringType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'string';
    defaultValue?: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    maxLength?: number;
    datatype?: 'string' | 'integer' | 'float';
    size?: 'large' | 'small' | 'medium';
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
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
    label: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
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
    groupLabel: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
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
    sameLine?: boolean;
    customLabel?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    datatype?: 'string' | 'integer' | 'float' | 'text';
    columns?: number;
    rows?: number;
    alignment?: 'vertical' | 'horizontal' | 'auto';
    customAlignmentLengths?: number[];
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
    sameLine?: boolean;
    customLabel?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    customChoice?: string;
    datatype?: 'string' | 'integer' | 'float' | 'text' | 'boolean';
    columns?: number;
    rows?: number;
    alignment?: 'vertical' | 'horizontal' | 'auto';
    customAlignmentLengths?: number[];
};

export type InputRadioNumberType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'radioNumber';
    valueRange: {
        min: number | ParsingFunction<number, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
        max: number | ParsingFunction<number, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    };
    iconSize?: string;
    icon?: IconProp;
    inputIconPath?: { iconPath: string; iconSize: string };
    overMaxAllowed?: boolean;
    columns?: number;
    sameLine?: boolean;
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
    labels?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>[];
    trackClassName?: string;
};

export type InputDatePickerType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    inputType: 'datePicker';
    showTimeSelect?: boolean;
    placeholderText?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    maxDate?: Date | ParsingFunction<Date, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    minDate?: Date | ParsingFunction<Date, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    locale?: { [languageCode: string]: string };
    size?: 'small' | 'medium' | 'large';
};

type InputMapType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    defaultCenter: { lat: number; lon: number };
    geocodingQueryString?: ParsingFunction<string | undefined, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    refreshGeocodingLabel?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    afterRefreshButtonText?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    icon?: {
        url: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
        size?: [number, number];
    };
    containsHtml?: boolean;
    maxZoom?: number;
    defaultZoom?: number;
    canBeCollapsed?: boolean;
    shortname?: string;
};

export type InputMapPointType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = InputMapType<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    inputType: 'mapPoint';
    showSearchPlaceButton?: boolean | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
};

export type InputMapFindPlaceType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = InputMapType<
    CustomSurvey,
    CustomHousehold,
    CustomHome,
    CustomPerson
> & {
    inputType: 'mapFindPlace';
    showSearchPlaceButton?: boolean | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    placesIcon?: {
        url: string | ParsingFunction<string, CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
        size?: [number, number];
    };
    maxGeocodingResultsBounds?: ParsingFunction<
        [{ lat: number; lng: number }, { lat: number; lng: number }] | undefined,
        CustomSurvey,
        CustomHousehold,
        CustomHome,
        CustomPerson
    >;
    height?: string; // the height of the map container in css units: example: 28rem or 550px
    coordinatesPrecision?: number; // number of decimals to keep for latitute longitude coordinates.
    invalidGeocodingResultTypes?: string[];
    showPhoto?: boolean;
    autoConfirmIfSingleResult?: boolean;
    updateDefaultValueWhenResponded?: boolean;
};

export type QuestionWidgetConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = {
    type: 'question';
    twoColumns?: boolean;
    joinWith?: string;
    path: InterviewResponsePath<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    containsHtml?: boolean;
    label: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;

    /**
     * When the conditional triggers a hide status and then a show status later on,
     * instead of reverting to default or empty value, use the assigned value of the conditional:
     * this is useful when we want to hide a widget but keep its assigned value intact after hide/show toggle.
     */
    useAssignedValueOnHide?: boolean;

    helpPopup?: {
        title: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
        content: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
        containsHtml?: boolean;
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
    | InputRadioNumberType<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
);

export type WidgetConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> =
    | QuestionWidgetConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
    | {
          type: 'text';
          align?: 'center' | 'left' | 'right';
          path?: string;
          containsHtml?: boolean;
          text: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          classes?: string;
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
          // FIXME What is this path used for? Document and/or type further
          path: string;
          color?: string;
          label: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          hideWhenRefreshing?: boolean;
          icon?: IconProp;
          iconPath?: string;
          align?: 'center' | 'left' | 'right';
          // FIXME: Type the section and sections parameters
          action: (section: any, sections: any[], saveCallback?: () => void) => void;
          // FIXME: Type the saveCallback. There is a `this` bound to the function, with props.interview. See if we can pass the interview as parameter instead, and/or anything else.
          saveCallback?: () => void;
          confirmPopup?: {
              title?: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
              content: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          };
          size?: 'small' | 'medium' | 'large';
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
      }
    | {
          type: 'infoMap';
          path?: string;
          conditional?: ParsingFunction<
              boolean | [boolean] | [boolean, unknown],
              CustomSurvey,
              CustomHousehold,
              CustomHome,
              CustomPerson
          >;
          title: I18nData<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
          // TODO Further type this
      };
