/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO As code migrates to typescript, those types will evolve

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { UserInterviewAttributes, InterviewResponsePath } from '../interviews/interview';
import { ParsingFunction } from '../../utils/helpers';
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
export type ValidationFunction<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = (
    value: unknown | undefined,
    customValue: unknown | undefined,
    interview: UserInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>,
    path: string,
    customPath?: string,
    user?: CliUser
) => { validation: boolean; errorMessage: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> }[];

export type LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    [lang: string]: string | ParsingFunction<string, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
};

export type InputStringType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'string';
    defaultValue?: string | ParsingFunction<string, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    maxLength?: number;
    datatype?: 'string' | 'integer' | 'float';
    size?: 'large' | 'small' | 'medium';
};

export type InputTextType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'text';
    defaultValue?: string | ParsingFunction<string, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    maxLength?: number;
    shortname?: string;
    rows?: number;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

// TODO This type is used by select, checkbox, radio, buttons etc. See if we can leverage functionality. Now every widget uses a subset of the properties (some may not need some of them, some could use them)
type BaseChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    label: string | { [lang: string]: string };
    hidden?: boolean;
    icon?: IconProp;
    iconPath?: string;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    color?: string;
    size?: 'large' | 'small' | 'medium';
};
export type ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = BaseChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> & {
    value: string;
};

export type RadioChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = BaseChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> & {
    value: string | boolean;
};

export type GroupedChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    groupShortname: string;
    groupLabel: string | { [lang: string]: string };
    choices: ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[];
};

export const isGroupedChoice = <Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>(
    choice: GroupedChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> | ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
): choice is GroupedChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (choice as any).groupShortname === 'string';
};

export type InputCheckboxType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'checkbox';
    choices:
        | ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[]
        | ParsingFunction<ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    columns?: number;
    sameLine?: boolean;
    customLabel?: string | LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

export type InputRadioType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'radio';
    choices:
        | RadioChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[]
        | ParsingFunction<RadioChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    columns?: number;
    sameLine?: boolean;
    customLabel?: string | LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    customChoice?: string;
    datatype?: 'string' | 'integer' | 'float' | 'text' | 'boolean';
};

// TODO Could select widget have a custom 'other' field? Like checkbox and radios
export type InputSelectType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'select';
    choices:
        | (GroupedChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> | ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>)[]
        | ParsingFunction<
              (GroupedChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> | ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>)[],
              Su,
              Ho,
              Pe,
              Pl,
              Ve,
              Vp,
              Tr,
              Se
          >;
    // string css style for the icon size, for example '2em'
    datatype?: 'string' | 'integer' | 'float' | 'text';
};

export type InputMultiselectType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'multiselect';
    choices:
        | ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[]
        | ParsingFunction<ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    // string css style for the icon size, for example '2em'
    datatype?: 'string' | 'integer' | 'float' | 'text';
    multiple?: boolean;
    // TODO What is a shortcut? Is the name right? It looks like a subset of the choices
    shortcuts?: ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[];
    onlyLabelSearch?: boolean;
    isClearable?: boolean;
    closeMenuOnSelect?: boolean;
};

export type InputButtonType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'button';
    choices:
        | ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[]
        | ParsingFunction<ChoiceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>[], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    hideWhenRefreshing?: boolean;
    align?: 'center' | 'left' | 'right';
    isModal?: boolean;
    sameLine?: boolean;
};

export type InputTimeType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'time';
    suffixTimes?: ParsingFunction<{ [timeStr: string]: string }, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    minTimeSecondsSinceMidnight?: number | ParsingFunction<number, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    maxTimeSecondsSinceMidnight?: number | ParsingFunction<number, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    minuteStep?: number | ParsingFunction<number, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    addHourSeparators?: boolean;
};

export type InputRangeType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'slider';
    maxValue?: number;
    minValue?: number;
    formatLabel?: (value: number, lang: string) => string;
    labels?: (string | LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>)[];
    trackClassName?: string;
};

export type InputDatePickerType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    inputType: 'datePicker';
    showTimeSelect?: boolean;
    placeholderText?: string | LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    maxDate?: Date | ParsingFunction<Date, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    minDate?: Date | ParsingFunction<Date, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    locale?: { [languageCode: string]: string };
};

type InputMapType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = {
    defaultCenter: { lat: number; lon: number };
    geocodingQueryString?: ParsingFunction<string | undefined, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    refreshGeocodingLabel?: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    afterRefreshButtonText?: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    icon?: {
        url: string | ParsingFunction<string, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    };
    containsHtml?: boolean;
    maxZoom?: number;
    defaultZoom?: number;
    canBeCollapsed?: boolean;
};

export type InputMapPointType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = InputMapType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> & {
    inputType: 'mapPoint';
};

export type InputMapFindPlaceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> = InputMapType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> & {
    inputType: 'mapFindPlace';
    placesIcon?: {
        url: string | ParsingFunction<string, Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
    };
    showPhoto?: boolean;
    autoConfirmIfSingleResult?: boolean;
    updateDefaultValueWhenResponded?: boolean;
};

export type WidgetConfig<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> =
    | ({
          type: 'question';
          twoColumns?: boolean;
          path: InterviewResponsePath<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          containsHtml?: boolean;
          label: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          helpPopup?: {
              title: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
              content: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          };
          validations?: ValidationFunction<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
      } & (
          | InputStringType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputTextType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputCheckboxType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputMultiselectType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputRadioType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputButtonType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputTimeType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputMapPointType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputMapFindPlaceType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputRangeType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputDatePickerType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
          | InputSelectType<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
      ))
    | {
          type: 'text';
          align?: 'center' | 'left' | 'right';
          containsHtml?: boolean;
          text: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          classes?: string;
          conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
      }
    | {
          type: 'group';
          path: string;
          conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          // TODO Further type this
      }
    | {
          type: 'button';
          // FIXME What is this path used for? Document and/or type further
          path: string;
          color?: string;
          label: LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          hideWhenRefreshing?: boolean;
          icon?: IconProp;
          iconPath?: string;
          align?: 'center' | 'left' | 'right';
          // FIXME: Type the section and sections parameters
          action: (section: any, sections: any[], saveCallback?: () => void) => void;
          // FIXME: Type the saveCallback. There is a `this` bound to the function, with props.interview. See if we can pass the interview as parameter instead, and/or anything else.
          saveCallback?: () => void;
          // FIXME Type the confirm popup
          confirmPopup?: any;
          size?: 'small' | 'medium' | 'large';
          conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
      }
    | {
          type: 'infoMap';
          conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown], Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>;
          // TODO Further type this
      };
