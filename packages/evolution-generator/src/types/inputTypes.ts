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
type Multiple = boolean;
type Columns = 1 | 2;
type Path = string;
type Placeholder = string;
type Align = 'left' | 'right' | 'center';
type Title = { fr: string; en: string };
export type InputFilter = (value) => string | number;
type LabelFunction = (t: TFunction, interview?, path?) => string;
type LabelNotFunction = { en: string | ((interview?, path?) => string); fr: string | ((interview?, path?) => string) };
type Label = LabelFunction | LabelNotFunction;
type TextKey = LabelFunction | LabelNotFunction;
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
    customValue?: number | string,
    interview?: any,
    path?: Path,
    customPath?: Path
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
    content: { fr: string; en: string };
    // TODO: This is the correct type, but it doesn't work with the current implementation
    // title: (t: TFunction) => string;
    // content: (t: TFunction) => string;
};
type DefaultCenter = {
    lat: number;
    lon: number;
};
type Polygons = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
type Geojsons = (interview?: any, path?: Path, activeUuid?: any) => { polygons: Polygons };

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
    helpPopup?: HelpPopup;
    conditional: Conditional;
    validations?: Validations;
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
};

/* Text widgetConfig Type */
export type InfoTextBase = {
    type: 'text';
    align?: Align;
    containsHtml: ContainsHtml;
};
export type InfoText = InfoTextBase & {
    text: TextKey;
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
    color: 'green';
    hideWhenRefreshing: boolean;
    icon: any; // icon: IconDefinition;
    align: Align;
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

/* InputText widgetConfig Type */
export type TextBase = {
    type: 'question';
    inputType: 'text';
    datatype: 'text';
    containsHtml?: ContainsHtml;
    twoColumns: false;
};
export type Text = TextBase & {
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
    afterRefreshButtonText: TextKey;
    validations?: Validations;
};
export type InputMapFindPlace = InputMapFindPlaceBase & {
    path: Path;
    label: Label;
    icon: { url: string; size: [number, number] };
    geocodingQueryString: (interview, path?) => void;
    conditional: Conditional;
};

/* InfoMap widgetConfig Type */
export type InfoMap = {
    type: 'infoMap';
    defaultCenter: DefaultCenter;
    title: Title;
    linestringColor: string;
    conditional: Conditional;
    geojsons: Geojsons;
};
