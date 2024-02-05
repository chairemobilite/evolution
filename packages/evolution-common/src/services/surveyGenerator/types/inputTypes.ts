/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';
// import IconDefinition from '@fortawesome/fontawesome-svg-core/definitions/IconDefinition';

/* Define types for all the different input types */
type ContainsHtml = boolean;
type TwoColumns = boolean;
type AddCustom = boolean;
type Columns = 1 | 2;
type Path = string;
type Placeholder = string;
type Text = (t: TFunction) => string;
export type InputFilter = (value) => string | number;
type LabelFunction = (t: TFunction, interview?, path?) => string;
type LabelNotFunction = { en: string; fr: string };
type Label = LabelFunction | LabelNotFunction;
export type Labels = {
    fr: string;
    en: string;
}[];
type Choice = {
    value: string | number;
    label: {
        fr: string;
        en: string;
    };
    conditional?: Conditional;
};
type ChoiceFunction = (interview, path?: Path) => Choice[];
export type Choices = Choice[] | ChoiceFunction;
export type Conditional = (interview: any, path?: Path) => boolean | (boolean | null)[];
export type Validations = (
    value?: number | string,
    customValue?,
    interview?,
    path?,
    customPath?
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
    title: { fr: string; en: string };
    content: { fr: string; en: string };
    // TODO: This is the correct type, but it doesn't work with the current implementation
    // title: (t: TFunction) => string;
    // content: (t: TFunction) => string;
};

// TODO: Place all the correct types in Evolution typescript files
// TODO: Add the correct types for all the different input types
// TODO: Add some missing types for the different input types

/* InputRadio widgetConfig Type */
export type InputRadioBase = {
    type: 'question';
    inputType: 'radio';
    datatype: 'string' | 'integer';
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
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
};

/* InputString widgetConfig Type */
export type InputStringBase = {
    type: 'question';
    inputType: 'string';
    datatype: 'string' | 'integer';
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
    size?: 'small' | 'large';
    inputFilter?: InputFilter;
    numericKeyboard?: boolean;
    maxLength?: number;
    placeholder?: Placeholder;
};
export type InputString = InputStringBase & {
    path: Path;
    label: Label;
    conditional: Conditional;
    validations?: Validations;
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
};

/* InputText widgetConfig Type */
export type InputTextBase = {
    type: 'text';
    containsHtml: ContainsHtml;
};
export type InputText = InputTextBase & {
    path: Path;
    text: Text;
    conditional: Conditional;
};

/* InputRange widgetConfig Type */
export type InputRangeBase = {
    type: 'question';
    inputType: 'slider';
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
    initValue: null;
    trackClassName: string;
};
export type InputRangeConfig = {
    labels: Labels;
    minValue?: number;
    maxValue?: number;
    formatLabel?: (value: number, lang: string) => string;
};
export type InputRange = InputRangeBase &
    InputRangeConfig & {
        path: Path;
        label: Label;
        conditional: Conditional;
        validations?: Validations;
    };

/* InputCheckbox widgetConfig Type */
export type InputCheckboxBase = {
    type: 'question';
    inputType: 'checkbox';
    datatype: 'string' | 'integer';
    containsHtml: ContainsHtml;
    twoColumns: TwoColumns;
    multiple: true;
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
};

/* InputSelect widgetConfig Type */
export type InputSelectBase = {
    type: 'question';
    inputType: 'select';
    datatype: 'string';
    twoColumns: TwoColumns;
    hasGroups: boolean;
};
export type InputSelect = InputSelectBase & {
    path: Path;
    label: Label;
    choices: Choices;
    conditional: Conditional;
    validations?: Validations;
};

/* InputButton widgetConfig Type */
export type InputButtonBase = {
    type: 'button';
    color: 'green';
    hideWhenRefreshing: boolean;
    icon: any; // icon: IconDefinition;
    align: 'left' | 'right' | 'center';
    action: () => void;
};
export type InputButton = InputButtonBase & {
    path: Path;
    label: Label;
    confirmPopup?: {
        shortname: string;
        content: { fr: (interview, path) => string; en: (interview, path) => string };
        showConfirmButton: boolean;
        cancelButtonColor: 'blue' | 'green';
        cancelButtonLabel: { fr: string; en: string };
        conditional: Conditional;
    };
    saveCallback?: () => void;
};

/* InputText textArea widgetConfig Type */
export type TextAreaBase = {
    type: 'question';
    inputType: 'text';
    datatype: 'text';
    containsHtml?: ContainsHtml;
    twoColumns: false;
};
export type TextArea = TextAreaBase & {
    path: Path;
    label: Label;
    conditional: Conditional;
    validations?: Validations;
};

/* Group type */
export type Group = {
    type: 'group';
    path: Path;
    groupShortname: string;
    shortname: string;
    groupName: { fr: string; en: string };
    name: { fr: NameFunction; en: NameFunction };
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
    placesIcon: { url: (interview?, path?) => string; size: [number, number] };
    defaultValue?: (interview) => void;
    defaultCenter: { lat: number; lon: number };
    refreshGeocodingLabel: Label;
    showSearchPlaceButton: (interview?, path?) => boolean;
    afterRefreshButtonText: Text;
    validations?: Validations;
};
export type InputMapFindPlace = InputMapFindPlaceBase & {
    path: Path;
    label: Label;
    icon: { url: string; size: [number, number] };
    geocodingQueryString: (interview, path?) => void;
    conditional: Conditional;
};
