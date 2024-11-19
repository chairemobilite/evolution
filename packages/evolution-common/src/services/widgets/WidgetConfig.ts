/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO As code migrates to typescript, those types will evolve

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { UserInterviewAttributes, InterviewResponsePath, InterviewResponses } from '../interviews/interview';
import {
    ParsingFunction,
    I18nData,
    InterviewUpdateCallbacks,
    ParsingFunctionWithCallbacks,
    ButtonAction
} from '../../utils/helpers';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { TFunction } from 'i18next';

type IconData = {
    url: string | ParsingFunction<string>;
    size?: [number, number];
};

type WidgetSize = 'small' | 'medium' | 'large';
// ChatGPT: This could represent the directional alignment options as it "is focused on the direction in which elements are aligned"
type WidgetDirectionAlign = 'center' | 'left' | 'right';
// ChatGPT: This would represent the spatial alignment options as it "pertains to the spatial orientation"
type WidgetSpaceAlign = 'vertical' | 'horizontal' | 'auto';

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
export type ValidationFunction = (
    value: unknown | undefined,
    customValue: unknown | undefined,
    interview: UserInterviewAttributes,
    path: string,
    customPath?: string,
    user?: CliUser
) => {
    validation: boolean;
    errorCode?: string;
    errorMessage: I18nData;
    isWarning?: boolean; // For now, used only in admin validations and auditing. Will be displayed differently in audits.
}[];

export type InputStringType = {
    inputType: 'string';
    defaultValue?: string | ParsingFunction<string>;
    maxLength?: number;
    datatype?: 'string' | 'integer' | 'float';
    size?: WidgetSize;
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    placeholder?: string;
    inputFilter?: (input: string) => string;
    // See https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode for the effect of the different options.
    keyboardInputMode?: 'none' | 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url';
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
type BaseChoiceType = {
    label: I18nData;
    hidden?: boolean;
    icon?: IconProp;
    iconPath?: string;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
    color?: string;
    size?: WidgetSize;
};
export type ChoiceType = BaseChoiceType & {
    value: string;
};

export type RadioChoiceType = BaseChoiceType & {
    value: string | boolean;
};

export type GroupedChoiceType = {
    groupShortname: string;
    groupLabel: I18nData;
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
    sameLine?: boolean;
    customLabel?: I18nData;
    datatype?: 'string' | 'integer' | 'float' | 'text';
    columns?: number;
    rows?: number;
    alignment?: WidgetSpaceAlign;
    customAlignmentLengths?: number[];
};

export type InputRadioType = {
    inputType: 'radio';
    choices: RadioChoiceType[] | ParsingFunction<RadioChoiceType[]>;
    // string css style for the icon size, for example '2em'
    iconSize?: string;
    seed?: number;
    shuffle?: boolean;
    addCustom?: boolean;
    sameLine?: boolean;
    customLabel?: I18nData;
    customChoice?: string;
    customPath?: string;
    datatype?: 'string' | 'integer' | 'float' | 'text' | 'boolean';
    columns?: number;
    rows?: number;
    alignment?: WidgetSpaceAlign;
    customAlignmentLengths?: number[];
};

export type InputRadioNumberType = {
    inputType: 'radioNumber';
    valueRange: {
        min: number | ParsingFunction<number>;
        max: number | ParsingFunction<number>;
    };
    iconSize?: string;
    icon?: IconProp;
    inputIconPath?: { iconPath: string; iconSize: string };
    overMaxAllowed?: boolean;
    columns?: number;
    sameLine?: boolean;
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
    align?: WidgetDirectionAlign;
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
    labels?: I18nData[];
    trackClassName?: string;
    /** Whether to include a 'not applicable' checkbox that will disable the input */
    includeNotApplicable?: boolean;
    /** An optional label for the 'not applicable' text. Only used if includeNotApplicable is true */
    notApplicableLabel?: I18nData;
};

export type InputDatePickerType = {
    inputType: 'datePicker';
    showTimeSelect?: boolean;
    placeholderText?: I18nData;
    maxDate?: Date | ParsingFunction<Date>;
    minDate?: Date | ParsingFunction<Date>;
    locale?: { [languageCode: string]: string };
    size?: WidgetSize;
};

type InputMapType = {
    defaultCenter: { lat: number; lon: number } | ParsingFunction<{ lat: number; lon: number }>;
    geocodingQueryString?: ParsingFunction<string | { queryString: string; zoom: number }[] | undefined>;
    refreshGeocodingLabel?: I18nData;
    afterRefreshButtonText?: I18nData;
    icon?: IconData;
    containsHtml?: boolean;
    maxZoom?: number;
    defaultZoom?: number;
    canBeCollapsed?: boolean;
    shortname?: string;
    defaultValue?: GeoJSON.Point | ParsingFunction<GeoJSON.Point>;
};

export type InputMapPointType = InputMapType & {
    inputType: 'mapPoint';
    showSearchPlaceButton?: boolean | ParsingFunction<boolean>;
};

export type InputMapFindPlaceType = InputMapType & {
    inputType: 'mapFindPlace';
    showSearchPlaceButton?: boolean | ParsingFunction<boolean>;
    searchPlaceButtonColor?: string | ParsingFunction<string>;
    placesIcon?: IconData;
    maxGeocodingResultsBounds?: ParsingFunction<
        [{ lat: number; lng: number }, { lat: number; lng: number }] | undefined
    >;
    height?: string; // the height of the map container in css units: example: 28rem or 550px
    coordinatesPrecision?: number; // number of decimals to keep for latitute longitude coordinates.
    invalidGeocodingResultTypes?: string[];
    showPhoto?: boolean;
    autoConfirmIfSingleResult?: boolean;
    updateDefaultValueWhenResponded?: boolean;
};

export type BaseQuestionType = {
    type: 'question';
    twoColumns?: boolean;
    /**
     * Specify the shortname of the widget with which to visually connect this
     * one.  This is useful for widgets that are related to each other, like all
     * fields of the address for example. In the form, they will be visually
     * connected in the same box instead of each widget in a separate box. The
     * widget to join with needs to be the very next or previous one in the
     * form. To join multiple widgets, each must specify the name of its own
     * previous or next widget.
     */
    joinWith?: string;
    path: InterviewResponsePath;
    containsHtml?: boolean;
    label: I18nData;

    /**
     * When the conditional triggers a hide status and then a show status later on,
     * instead of reverting to default or empty value, use the assigned value of the conditional:
     * this is useful when we want to hide a widget but keep its assigned value intact after hide/show toggle.
     */
    useAssignedValueOnHide?: boolean;

    helpPopup?: {
        title: I18nData;
        content: I18nData;
        containsHtml?: boolean;
    };
    validations?: ValidationFunction;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
};

export type QuestionWidgetConfig = BaseQuestionType &
    (
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
        | InputSelectType
        | InputRadioNumberType
    );

export type TextWidgetConfig = {
    type: 'text';
    align?: WidgetDirectionAlign;
    path?: string;
    containsHtml?: boolean;
    text: I18nData;
    classes?: string;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
};

export type ButtonWidgetConfig = {
    type: 'button';
    // The 'path' is required to resolve ${relativePath} in conditional expressions.
    path?: string;
    containsHtml?: boolean;
    color?: string;
    label: I18nData;
    /**
     * Whether to hide the button when the page is being refreshed (loading/saving data from/to the server)
     */
    hideWhenRefreshing?: boolean;
    icon?: IconProp;
    iconPath?: string;
    align?: WidgetDirectionAlign;
    action: ButtonAction;
    saveCallback?: ParsingFunctionWithCallbacks<void>;
    confirmPopup?: {
        title?: I18nData;
        content: I18nData;
        cancelAction?: React.MouseEventHandler;
        showCancelButton?: boolean;
        showConfirmButton?: boolean;
        cancelButtonLabel?: I18nData;
        confirmButtonLabel?: I18nData;
        cancelButtonColor?: string;
        confirmButtonColor?: string;
        conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
    };
    size?: WidgetSize;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
};

export type SurveyMapObjectProperty = {
    highlighted?: boolean;
    label?: I18nData;
    sequence?: number;
    icon?: {
        url: string;
        size: [number, number];
    };
    birdDistance?: number;
    active?: boolean;
    bearing?: number;
};

type SurveyMapObjectPolygonProperty = SurveyMapObjectProperty & {
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    minLat?: number;
    maxLat?: number;
    minLong?: number;
    maxLong?: number;
};

export type InfoMapWidgetConfig = {
    type: 'infoMap';
    path?: string;
    conditional?: ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
    title: I18nData;
    geojsons: ParsingFunction<{
        points?: GeoJSON.FeatureCollection<GeoJSON.Point, SurveyMapObjectProperty>;
        linestrings?: GeoJSON.FeatureCollection<GeoJSON.LineString, SurveyMapObjectProperty>;
        polygons?: GeoJSON.FeatureCollection<GeoJSON.Polygon, SurveyMapObjectPolygonProperty>;
    }>;
    defaultCenter?: { lat: number; lon: number } | ParsingFunction<{ lat: number; lon: number }>;
    maxZoom?: number;
    defaultZoom?: number;
    linestringColor?: string;
    linestringActiveColor?: string;
};

export type GroupNameLangData = {
    [lang: string]:
        | string
        | ((object: unknown, sequence: number, interview?: UserInterviewAttributes, path?: string) => string);
};

export type GroupNameTranslatableStringFunction = (
    t: TFunction,
    object: unknown,
    sequence: number,
    interview?: UserInterviewAttributes,
    path?: string
) => string;

export type GroupNameI18nData = string | GroupNameLangData | GroupNameTranslatableStringFunction;

export type GroupConfig = {
    type: 'group';
    path: string;
    widgets: string[];
    showTitle?: boolean | ParsingFunction<boolean>;
    /** Title of the group, that will be displayed if showTitle is true */
    title?: I18nData;
    /** A translatable string that will be the title of individual group objects */
    name?: GroupNameI18nData;
    conditional?: boolean | ParsingFunction<boolean | [boolean] | [boolean, unknown]>;
    /** Whether to show a specific grouped object
     * FIXME: Is this redundant with filter?
     */
    groupedObjectConditional?: boolean | ParsingFunction<boolean>;
    /**
     * This function is called for the whole group and must return whether to
     * show the add button. The path received in the parsing function is the
     * path to the current group and not one of the individual element of the
     * group.
     */
    showGroupedObjectAddButton?: boolean | ParsingFunction<boolean>;
    groupedObjectAddButtonLabel?: I18nData;
    /**
     * This function is called for each individual group object and must return
     * whether to show the delete button for the current object. The path
     * received in the parsing function is the path to the current object.
     */
    showGroupedObjectDeleteButton?: boolean | ParsingFunction<boolean>;
    groupedObjectDeleteButtonLabel?: I18nData;
    deleteConfirmPopup?: {
        content: I18nData;
        conditional?: boolean | ParsingFunction<boolean>;
        title?: I18nData;
        cancelAction?: React.MouseEventHandler;
        containsHtml?: boolean;
    };
    addButtonLocation?: 'bottom' | 'top' | 'both';
    addButtonSize?: string;
    /**
     * A function to filter the grouped objects and returns an object containing only the filtered objects
     * FIXME: Redundant with groupedObjectConditional?
     */
    filter?: (
        interview: UserInterviewAttributes,
        objects: { [objectId: string]: unknown }
    ) => { [objectId: string]: unknown };
};

export type WidgetConfig =
    | QuestionWidgetConfig
    | TextWidgetConfig
    | GroupConfig
    | ButtonWidgetConfig
    | InfoMapWidgetConfig;
