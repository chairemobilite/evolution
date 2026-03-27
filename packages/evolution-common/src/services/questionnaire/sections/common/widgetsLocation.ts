/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import config from '../../../../config/project.config';
import { formatGeocodingQueryStringFromMultipleFields, getResponse } from '../../../../utils/helpers';
import type {
    InputMapFindPlaceType,
    InputStringType,
    I18nData,
    ParsingFunction,
    ValidationFunction,
    WidgetConfig,
    WidgetConditional,
    BaseQuestionType
} from '../../../questionnaire/types';
import type { WidgetConfigFactory } from '../types';

/**
 * List of geocoding result types that are considered invalid for a location
 *
 * FIXME This is based on the Google Maps geocoding result types, we should make
 * it more generic when we support more geocoding services.
 */
export const defaultLocationInvalidGeocodingResultTypes: string[] = [
    'political',
    'country',
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
    'administrative_area_level_6',
    'administrative_area_level_7',
    'colloquial_area',
    'locality',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
    'sublocality_level_5',
    'neighborhood',
    'route'
];

const defaultPlacesIcon = {
    url: '/dist/icons/interface/markers/marker_round_with_small_circle.svg',
    size: [35, 35] as [number, number]
};

const defaultSelectedPlacesIcon = {
    url: '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
    size: [35, 35] as [number, number]
};

type GeocodingQueryFieldPath = {
    /**
     * Field path to read for geocoding query. If `absolute` is false or
     * undefined, this path is interpreted as relative to the widget's own path
     * (for example `../name`).
     */
    path: string;
    /**
     * Whether `path` should be interpreted as an absolute response path.
     */
    pathType: 'absolute' | 'relative' | 'inGroup';
};

type LocationNameWidgetOptions = {
    path: string;
    label: I18nData;
    containsHtml?: boolean;
    twoColumns?: boolean;
    conditional?: WidgetConditional;
    validations?: ValidationFunction;
    defaultValue?: string | ParsingFunction<string>;
    maxLength?: number;
    placeholder?: string;
    joinWith?: string;
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
};

type LocationGeographyWidgetOptions = Pick<
    BaseQuestionType,
    'path' | 'label' | 'twoColumns' | 'containsHtml' | 'conditional' | 'validations'
> &
    Pick<
        InputMapFindPlaceType,
        | 'defaultZoom'
        | 'defaultValue'
        | 'defaultCenter'
        | 'height'
        | 'maxZoom'
        | 'icon'
        | 'placesIcon'
        | 'selectedIcon'
        | 'updateDefaultValueWhenResponded'
        | 'maxGeocodingResultsBounds'
        | 'showSearchPlaceButton'
        | 'searchPlaceButtonColor'
        | 'invalidGeocodingResultTypes'
        | 'refreshGeocodingLabel'
    > & {
        geocodingQueryStringData: GeocodingQueryData;
    };

// Return the function to use for the geocodingQueryString property of the
// geography widget, based on the provided geocodingQueryStringData
// configuration. If the configuration is of type 'function', it returns the
// provided function. If the configuration is of type 'fields', it returns a
// function that reads the specified fields from the interview responses and
// formats them into a geocoding query string.
const getGeocodingQueryStringProperty = (
    geocodingQueryStringData: LocationGeographyWidgetOptions['geocodingQueryStringData']
): InputMapFindPlaceType['geocodingQueryString'] | undefined => {
    if (geocodingQueryStringData.type === 'function') {
        return geocodingQueryStringData.geocodingStringFunction;
    } else if (geocodingQueryStringData.type === 'fields') {
        return (interview, path) => {
            const fieldValues = geocodingQueryStringData.fieldPaths.map((fieldPathConfig) =>
                fieldPathConfig.pathType === 'absolute'
                    ? getResponse(interview, fieldPathConfig.path, null)
                    : fieldPathConfig.pathType === 'inGroup'
                        ? getResponse(interview, path, null, `../${fieldPathConfig.path}`)
                        : getResponse(interview, path, null, fieldPathConfig.path)
            );
            return formatGeocodingQueryStringFromMultipleFields(fieldValues);
        };
    }

    return undefined;
};

// Factory function to create the widget config for the location name widget, based on the provided options
const getLocationNameWidgetConfig = (options: LocationNameWidgetOptions): InputStringType => ({
    type: 'question',
    inputType: 'string',
    path: options.path,
    datatype: 'string',
    twoColumns: options.twoColumns ?? false,
    containsHtml: options.containsHtml ?? true,
    label: options.label,
    conditional: options.conditional,
    validations: options.validations,
    defaultValue: options.defaultValue,
    maxLength: options.maxLength,
    placeholder: options.placeholder,
    joinWith: options.joinWith,
    textTransform: options.textTransform
});

// Factory function to create the widget config for the location geography widget, based on the provided options
const getLocationGeographyWidgetConfig = (options: LocationGeographyWidgetOptions): InputMapFindPlaceType => ({
    type: 'question',
    inputType: 'mapFindPlace',
    path: options.path,
    datatype: 'geojson',
    twoColumns: options.twoColumns ?? false,
    containsHtml: options.containsHtml ?? false,
    label: options.label,
    height: options.height ?? '32rem',
    defaultCenter: options.defaultCenter ?? config.mapDefaultCenter,
    defaultZoom: options.defaultZoom,
    maxZoom: options.maxZoom,
    icon: options.icon,
    placesIcon: options.placesIcon ?? defaultPlacesIcon,
    selectedIcon: options.selectedIcon ?? defaultSelectedPlacesIcon,
    geocodingQueryString: getGeocodingQueryStringProperty(options.geocodingQueryStringData),
    maxGeocodingResultsBounds: options.maxGeocodingResultsBounds,
    showSearchPlaceButton: options.showSearchPlaceButton,
    searchPlaceButtonColor: options.searchPlaceButtonColor,
    invalidGeocodingResultTypes: options.invalidGeocodingResultTypes ?? defaultLocationInvalidGeocodingResultTypes,
    refreshGeocodingLabel: options.refreshGeocodingLabel,
    defaultValue: options.defaultValue,
    updateDefaultValueWhenResponded: options.updateDefaultValueWhenResponded,
    validations: options.validations,
    conditional: options.conditional
});

/**
 * Configuration for how to generate the geocoding query string for a location
 * geography widget, either based on a custom function or on the values of other
 * fields in the interview responses
 */
type GeocodingQueryData =
    | {
          type: 'fields';
          fieldPaths: GeocodingQueryFieldPath[];
      }
    | {
          type: 'function';
          geocodingStringFunction: InputMapFindPlaceType['geocodingQueryString'];
      };

/**
 * Types for options to create a pair of location name and geography widgets, as
 * well as a factory to create those widgets.
 *
 * TODO The list of possible options is not exhaustive. It is what was required
 * for the current use cases, add more options as we see the need for more
 * configurability
 */
export type LocationWithNameWidgetOptions = {
    /**
     * Path prefix for the widgets' names. The generated widgets will have names
     * `${widgetNamePrefix}Name` and `${widgetNamePrefix}Geography`. This allows
     * to create multiple pairs of name/geography widgets in the same section
     * without name conflicts.
     */
    widgetNamePrefix: string;
    /**
     * The path to which the widget's value will be saved. The path will be
     * appended with `.name` and `.geography` if set. Otherwise, it assumes this
     * is part of a group and the path will be `name` and `geography` directly
     * in that group.
     * */
    path?: string;
    /**
     * Configuration for the location name widget
     */
    nameWidget: {
        label: BaseQuestionType['label'];
        conditional?: WidgetConditional;
        validations?: ValidationFunction;
        defaultValue?: string | ParsingFunction<string>;
        containsHtml?: boolean;
    };
    /**
     * Configuration for the location geography widget
     */
    geographyWidget: {
        label: BaseQuestionType['label'];
        refreshGeocodingLabel?: InputMapFindPlaceType['refreshGeocodingLabel'];
        icon: InputMapFindPlaceType['icon'];
        defaultCenter?: InputMapFindPlaceType['defaultCenter'];
        defaultValue?: InputMapFindPlaceType['defaultValue'];
        /**
         * The validations for this field
         *
         * FIXME Many validations will be very similar for all callers
         * (workUsual, visitedPlaces, etc), we might want to provide instead a
         * validation options object that will automatically provide some
         * validations (imprecision, inaccessible zones, etc)
         */
        validations?: ValidationFunction;
        conditional?: WidgetConditional;
        /**
         * Configuration for how to generate the geocoding query string for this
         * widget, either based on a custom function or on the values of other
         * fields in the interview responses. If not provided, it will default
         * to using the value of the "name" field in the same group.
         */
        geocodingQueryStringData?: GeocodingQueryData;
        containsHtml?: boolean;
    };
};

/**
 * Widget factory that creates a pair of widgets for a location name and geography
 */
export class LocationWithNameWidgetsFactory implements WidgetConfigFactory {
    constructor(private options: LocationWithNameWidgetOptions) {
        /** Nothing to do */
    }

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        const widgetConfigs: Record<string, WidgetConfig> = {
            [`${this.options.widgetNamePrefix}Name`]: getLocationNameWidgetConfig({
                ...this.options.nameWidget,
                path: this.options.path ? `${this.options.path}.name` : 'name',
                joinWith: `${this.options.widgetNamePrefix}Geography`
            }),
            [`${this.options.widgetNamePrefix}Geography`]: getLocationGeographyWidgetConfig({
                ...this.options.geographyWidget,
                path: this.options.path ? `${this.options.path}.geography` : 'geography',
                defaultCenter: this.options.geographyWidget.defaultCenter ?? config.mapDefaultCenter,
                // If geocodingQueryStringData is not provided, it will default to using the "name" field in the same group as the geography widget, which is the expected use case for most callers of this factory
                geocodingQueryStringData: this.options.geographyWidget.geocodingQueryStringData ?? {
                    type: 'fields',
                    fieldPaths: [{ pathType: 'inGroup', path: 'name' }]
                }
            })
        };

        return widgetConfigs;
    };
}
