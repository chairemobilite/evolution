/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Note: This file includes types for all the different input and widgets types used in the evolution-generator

import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { InterviewUpdateCallbacks, ParsingFunctionWithCallbacks } from 'evolution-common/lib/utils/helpers';
import { InfoMapWidgetConfig } from 'evolution-common/lib/services/widgets/WidgetConfig';
import { TFunction } from 'i18next';

/* Define types for all the different input types */
type ContainsHtml = boolean;
type TwoColumns = boolean;
type AddCustom = boolean;
type CustomPath = string;
type CustomChoice = string;
type Multiple = boolean;
type Columns = 1 | 2;
type Path = string;
type Placeholder = string;
type DefaultValue = string | ((interview, path) => string | void);
type Align = 'left' | 'right' | 'center';
type Size = 'small' | 'large';
type Icon = {
    url: string | ((interview: any, path?: Path) => string);
    size: [number, number];
};
type DefaultCenter = { lat: number; lon: number } | ((interview: any, path?: Path) => { lat: number; lon: number });
type Title = { fr: string | ((interview, path) => string); en: string | ((interview, path) => string) };
export type InputFilter = (value) => string | number;
type LabelFunction = (t: TFunction, interview, path) => string;
type LabelNotFunction = { en: string | ((interview, path) => string); fr: string | ((interview, path) => string) };
type Label = LabelFunction | LabelNotFunction;
type TextKey = LabelFunction | LabelNotFunction;
export type Labels = {
    fr: string;
    en: string;
}[];
type Choice = {
    value: string | number | boolean;
    label: Label;
    internalId?: number;
    iconPath?: string;
    conditional?: Conditional;
};
type ChoiceFunction = (interview, path?: Path) => Choice[];
export type Choices = Choice[] | ChoiceFunction;
export type Conditional = (interview: any, path?: Path) => boolean | (boolean | null)[];
export type Validations = (
    value: number | string,
    customValue: number | string,
    interview: any,
    path: Path,
    customPath: Path
) => {
    validation: boolean;
    errorMessage?: {
        fr: string;
        en: string;
    };
}[];
export type NameFunction = (groupedObject, sequence, interview) => string;
export type HelpPopup = {
    containsHtml?: ContainsHtml;
    title: Title;
    content: Label;
};

// TODO: Add some missing types for the different input types

/* InputRadio widgetConfig Type */
export type InputRadioBase = {
    type: 'question';
    inputType: 'radio';
    datatype: 'string' | 'integer' | 'boolean';
    columns: Columns;
};
export type InputRadio = InputRadioBase & {
    path: Path;
    label: Label;
    helpPopup?: HelpPopup;
    choices: Choices;
    conditional: Conditional;
    validations?: Validations;
    addCustom?: AddCustom;
    customPath?: CustomPath;
    customChoice?: CustomChoice;
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
};

/* InputRadioNumber widgetConfig Type */
export type InputRadioNumberBase = {
    type: 'question';
    inputType: 'radioNumber';
    datatype: 'integer';
    columns: Columns;
    sameLine?: boolean;
};
export type InputRadioNumber = InputRadioNumberBase & {
    path: Path;
    label: Label;
    valueRange: {
        min: number;
        max: number;
    };
    overMaxAllowed: boolean;
    helpPopup?: HelpPopup;
    conditional: Conditional;
    validations?: Validations;
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
};

/* InputString widgetConfig Type */
export type InputStringBase = {
    type: 'question';
    inputType: 'string';
    datatype: 'string' | 'integer';
    size?: Size;
    inputFilter?: InputFilter;
    keyboardInputMode?: 'none' | 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url';
    maxLength?: number;
    placeholder?: Placeholder;
};
export type InputString = InputStringBase & {
    path: Path;
    label: Label;
    helpPopup?: HelpPopup;
    conditional: Conditional;
    validations?: Validations;
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
    defaultValue?: DefaultValue;
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
};

/* Text widgetConfig Type */
export type InfoTextBase = {
    type: 'text';
    align?: Align;
};
export type InfoText = InfoTextBase & {
    path?: Path; // Note: The 'path' is required to resolve ${relativePath} in conditional expressions.
    text: TextKey;
    conditional: Conditional;
    containsHtml: ContainsHtml;
};

/* InputRange widgetConfig Type */
export type InputRangeBase = {
    type: 'question';
    inputType: 'slider';
    initValue: null;
};
export type InputRangeConfig = {
    labels: Labels;
    minValue?: number;
    maxValue?: number;
    formatLabel?: (value: number, lang: string) => string;
    trackClassName: 'input-slider-blue' | 'input-slider-red-yellow-green' | 'input-slider-green-yellow-red';
};
export type InputRange = InputRangeBase &
    InputRangeConfig & {
        path: Path;
        label: Label;
        conditional: Conditional;
        containsHtml: ContainsHtml;
        twoColumns: TwoColumns;
        validations?: Validations;
    };

/* InputCheckbox widgetConfig Type */
export type InputCheckboxBase = {
    type: 'question';
    inputType: 'checkbox';
    datatype: 'string' | 'integer';
    multiple: Multiple;
    columns: Columns;
};
export type InputCheckbox = InputCheckboxBase & {
    path: Path;
    label: Label;
    choices: Choices;
    helpPopup?: HelpPopup;
    conditional: Conditional;
    validations?: Validations;
    addCustom?: AddCustom;
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
};

/* InputSelect widgetConfig Type */
export type InputSelectBase = {
    type: 'question';
    inputType: 'select';
    datatype: 'string';
    hasGroups: boolean;
};
export type InputSelect = InputSelectBase & {
    path: Path;
    label: Label;
    choices: Choices;
    conditional: Conditional;
    validations?: Validations;
    twoColumns: TwoColumns;
    containsHtml: ContainsHtml;
};

/* InputMultiselect widgetConfig Type */
export type InputMultiselect = {
    type: 'question';
    path: Path;
    inputType: 'multiselect';
    multiple: Multiple;
    datatype: 'string';
    twoColumns: TwoColumns;
    containsHtml: ContainsHtml;
    choices: Choices;
    label: Label;
    conditional: Conditional;
    validations?: Validations;
};

/* InputButton widgetConfig Type */
export type InputButtonBase = {
    type: 'button';
    color: 'green' | 'red' | 'blue' | 'grey';
    hideWhenRefreshing: boolean;
    icon: any;
    // icon: IconProp | IconDefinition;
    // icon: IconDefinition;
    align: Align;
    action: (callbacks: InterviewUpdateCallbacks, interview: UserInterviewAttributes, path: string, section, sections, saveCallback: ParsingFunctionWithCallbacks<void>) => void;
};
export type InputButton = InputButtonBase & {
    path: Path;
    label: Label;
    confirmPopup?: {
        shortname: string;
        content: Label;
        showConfirmButton?: boolean;
        cancelButtonColor?: 'green' | 'red' | 'blue' | 'grey';
        cancelButtonLabel?: Label;
        conditional?: Conditional;
    };
    size?: Size;
    saveCallback?: () => void;
    conditional?: Conditional;
};

/* InputText widgetConfig Type */
export type TextBase = {
    type: 'question';
    inputType: 'text';
    datatype: 'text';
};
export type Text = TextBase & {
    path: Path;
    label: Label;
    conditional: Conditional;
    validations?: Validations;
    containsHtml?: ContainsHtml;
    twoColumns: false;
};

/* Group type */
export type Group = {
    type: 'group';
    path: Path;
    groupShortname: string;
    shortname: string;
    groupName: Label;
    name: { fr: NameFunction; en: NameFunction };
    filter?: (interview, groupedObjects) => any;
    conditional?: Conditional;
};

/* InputMapFindPlace widgetConfig Type */
export type InputMapFindPlaceBase = {
    type: 'question';
    inputType: 'mapFindPlace';
    datatype: 'geojson';
    height: string;
    containsHtml: ContainsHtml;
    autoConfirmIfSingleResult: boolean;
    placesIcon: Icon;
    defaultValue?: DefaultValue;
    defaultCenter: DefaultCenter;
    refreshGeocodingLabel: Label;
    showSearchPlaceButton: (interview, path) => boolean;
    afterRefreshButtonText: TextKey;
    validations?: Validations;
};
export type InputMapFindPlace = InputMapFindPlaceBase & {
    path: Path;
    label: Label;
    icon: Icon;
    geocodingQueryString: (interview, path?) => void;
    conditional: Conditional;
};

/* InfoMap widgetConfig Type */
export type InfoMap = InfoMapWidgetConfig;
