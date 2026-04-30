/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import config from '../../../../../config/project.config';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import { InputMapFindPlaceType, InputStringType } from '../../../../questionnaire/types';
import {
    defaultLocationInvalidGeocodingResultTypes,
    LocationWithNameWidgetOptions,
    LocationWithNameWidgetsFactory
} from '../widgetsLocation';

describe('LocationWithNameWidgetsFactory', () => {
    test('should return the correct widget configs with minimal configuration', () => {
        const widgetConfig = new LocationWithNameWidgetsFactory({
            widgetNamePrefix: 'location',
            nameWidget: {
                label: 'main:LocationName'
            },
            geographyWidget: {
                label: 'main:LocationGeography',
                icon: { url: '/myIcon.svg', size: [20, 30] }
            }
        }).getWidgetConfigs();

        expect(widgetConfig).toEqual({
            locationName: {
                type: 'question',
                inputType: 'string',
                path: 'name',
                datatype: 'string',
                twoColumns: false,
                containsHtml: true,
                label: 'main:LocationName',
                conditional: undefined,
                validations: undefined,
                defaultValue: undefined,
                maxLength: undefined,
                placeholder: undefined,
                joinWith: 'locationGeography',
                textTransform: undefined
            },
            locationGeography: {
                type: 'question',
                inputType: 'mapFindPlace',
                path: 'geography',
                datatype: 'geojson',
                twoColumns: false,
                containsHtml: false,
                label: 'main:LocationGeography',
                height: '32rem',
                defaultCenter: config.mapDefaultCenter,
                defaultZoom: undefined,
                maxZoom: undefined,
                icon: { url: '/myIcon.svg', size: [20, 30] },
                placesIcon: {
                    url: '/dist/icons/interface/markers/marker_round_with_small_circle.svg',
                    size: [35, 35]
                },
                selectedIcon: {
                    url: '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
                    size: [35, 35]
                },
                geocodingQueryString: expect.any(Function),
                maxGeocodingResultsBounds: undefined,
                showSearchPlaceButton: undefined,
                searchPlaceButtonColor: undefined,
                invalidGeocodingResultTypes: defaultLocationInvalidGeocodingResultTypes,
                refreshGeocodingLabel: undefined,
                defaultValue: undefined,
                resetToDefaultUnlessUserInteracted: undefined,
                validations: undefined,
                conditional: undefined
            }
        });
    });
});

describe('LocationWithNameWidgetsFactory - locationName widget', () => {
    test('should set all name widget defaults when minimal configuration is provided', () => {
        const widgetConfig = new LocationWithNameWidgetsFactory({
            widgetNamePrefix: 'origin',
            nameWidget: {
                label: 'main:OriginName'
            },
            geographyWidget: {
                label: 'main:OriginGeography',
                icon: { url: '/icon.svg', size: [12, 12] },
            }
        }).getWidgetConfigs()['originName'] as InputStringType;

        expect(widgetConfig.path).toEqual('name');
        expect(widgetConfig.twoColumns).toBe(false);
        expect(widgetConfig.containsHtml).toBe(true);
        expect(widgetConfig.conditional).toBeUndefined();
        expect(widgetConfig.validations).toBeUndefined();
        expect(widgetConfig.defaultValue).toBeUndefined();
    });

    test('should use configured name widget values and path when provided', () => {
        const conditional = jest.fn().mockReturnValue([true, undefined]);
        const validations = jest.fn().mockReturnValue(true);
        const defaultValue = jest.fn().mockReturnValue('Default place name');

        const widgetConfig = new LocationWithNameWidgetsFactory({
            widgetNamePrefix: 'destination',
            path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1',
            nameWidget: {
                label: { en: 'Destination name', fr: 'Nom de destination' },
                containsHtml: false,
                conditional,
                validations,
                defaultValue
            },
            geographyWidget: {
                label: 'main:DestinationGeography',
                icon: { url: '/icon.svg', size: [10, 10] }
            }
        }).getWidgetConfigs()['destinationName'] as InputStringType;

        expect(widgetConfig.path).toEqual(
            'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.name'
        );
        expect(widgetConfig.label).toEqual({ en: 'Destination name', fr: 'Nom de destination' });
        expect(widgetConfig.containsHtml).toBe(false);
        expect(widgetConfig.conditional).toBe(conditional);
        expect(widgetConfig.validations).toBe(validations);
        expect(widgetConfig.defaultValue).toBe(defaultValue);
    });
});

describe('LocationWithNameWidgetsFactory - locationGeography widget', () => {
    test('should set all geography widget defaults when minimal configuration is provided', () => {
        const widgetConfig = new LocationWithNameWidgetsFactory({
            widgetNamePrefix: 'workplace',
            nameWidget: {
                label: 'main:WorkplaceName'
            },
            geographyWidget: {
                label: 'main:WorkplaceGeography',
                icon: { url: '/icon.svg', size: [14, 14] }
            }
        }).getWidgetConfigs()['workplaceGeography'] as InputMapFindPlaceType;

        expect(widgetConfig.path).toEqual('geography');
        expect(widgetConfig.twoColumns).toBe(false);
        expect(widgetConfig.containsHtml).toBe(false);
        expect(widgetConfig.height).toBe('32rem');
        expect(widgetConfig.defaultCenter).toEqual(config.mapDefaultCenter);
        expect(widgetConfig.placesIcon).toEqual({
            url: '/dist/icons/interface/markers/marker_round_with_small_circle.svg',
            size: [35, 35]
        });
        expect(widgetConfig.selectedIcon).toEqual({
            url: '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
            size: [35, 35]
        });
        expect(widgetConfig.invalidGeocodingResultTypes).toEqual(defaultLocationInvalidGeocodingResultTypes);
        expect(widgetConfig.validations).toBeUndefined();
        expect(widgetConfig.conditional).toBeUndefined();
    });

    test('should use configured geography widget values when provided', () => {
        const geographyConditional = jest.fn().mockReturnValue([false, undefined]);
        const geographyValidations = jest.fn().mockReturnValue(true);
        const geocodingStringFunction = jest.fn().mockReturnValue('custom geocoding string');

        const options: LocationWithNameWidgetOptions = {
            widgetNamePrefix: 'custom',
            path: 'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2',
            nameWidget: {
                label: 'main:CustomName'
            },
            geographyWidget: {
                label: { en: 'Custom geography', fr: 'Géographie personnalisée' },
                refreshGeocodingLabel: 'customSurvey:RefreshMapGeocoding',
                icon: { url: '/custom-icon.svg', size: [16, 24] },
                defaultCenter: { lat: 43.7, lon: -79.4 },
                defaultValue: {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-79.4, 43.7] },
                    properties: {}
                },
                validations: geographyValidations,
                conditional: geographyConditional,
                containsHtml: true,
                geocodingQueryStringData: {
                    type: 'function',
                    geocodingStringFunction
                },
                resetToDefaultUnlessUserInteracted: true
            }
        };

        const widgetConfig = new LocationWithNameWidgetsFactory(options).getWidgetConfigs()[
            'customGeography'
        ] as InputMapFindPlaceType;

        expect(widgetConfig.path).toEqual(
            'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2.geography'
        );
        expect(widgetConfig.label).toEqual({ en: 'Custom geography', fr: 'Géographie personnalisée' });
        expect(widgetConfig.containsHtml).toBe(true);
        expect(widgetConfig.defaultCenter).toEqual({ lat: 43.7, lon: -79.4 });
        expect(widgetConfig.defaultValue).toEqual({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-79.4, 43.7] },
            properties: {}
        });
        expect(widgetConfig.refreshGeocodingLabel).toEqual('customSurvey:RefreshMapGeocoding');
        expect(widgetConfig.validations).toBe(geographyValidations);
        expect(widgetConfig.conditional).toBe(geographyConditional);
        expect(widgetConfig.geocodingQueryString).toBe(geocodingStringFunction);
        expect(widgetConfig.resetToDefaultUnlessUserInteracted).toBe(true);
    });

    describe('geocodingQueryString (type: fields)', () => {

        test('should use the name field by default when not set', () => {
            const widgetConfig = new LocationWithNameWidgetsFactory({
                widgetNamePrefix: 'work',
                nameWidget: {
                    label: 'main:WorkName'
                },
                geographyWidget: {
                    label: 'main:WorkGeography',
                    icon: { url: '/icon.svg', size: [12, 12] }
                }
            }).getWidgetConfigs()['workGeography'] as InputMapFindPlaceType;

            const geocodingQueryString = widgetConfig.geocodingQueryString;

            expect(geocodingQueryString).toBeDefined();

            expect(
                geocodingQueryString!(
                    interviewAttributesForTestCases,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
                )
            ).toEqual('This is my work');
        });

        test('should build geocoding query string from absolute, relative and in-group paths', () => {
            const widgetConfig = new LocationWithNameWidgetsFactory({
                widgetNamePrefix: 'work',
                nameWidget: {
                    label: 'main:WorkName'
                },
                geographyWidget: {
                    label: 'main:WorkGeography',
                    icon: { url: '/icon.svg', size: [12, 12] },
                    geocodingQueryStringData: {
                        type: 'fields',
                        fieldPaths: [
                            {
                                path: 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name',
                                pathType: 'absolute'
                            },
                            { path: '../activityCategory', pathType: 'relative' },
                            { path: 'activity', pathType: 'inGroup' },
                            { path: '../_sequence', pathType: 'relative' },
                            { path: '../nonExisting', pathType: 'relative' }
                        ]
                    }
                }
            }).getWidgetConfigs()['workGeography'] as InputMapFindPlaceType;

            const geocodingQueryString = widgetConfig.geocodingQueryString;

            expect(geocodingQueryString).toBeDefined();

            expect(
                geocodingQueryString!(
                    interviewAttributesForTestCases,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
                )
            ).toEqual('This is my work, work, workUsual, 2');
        });

        test('should return undefined when no valid field value can be formatted', () => {
            const widgetConfigWithInvalidFields = new LocationWithNameWidgetsFactory({
                widgetNamePrefix: 'invalidFields',
                nameWidget: {
                    label: 'main:InvalidFieldsName'
                },
                geographyWidget: {
                    label: 'main:InvalidFieldsGeography',
                    icon: { url: '/icon.svg', size: [12, 12] },
                    geocodingQueryStringData: {
                        type: 'fields',
                        fieldPaths: [
                            { path: '../unknownField', pathType: 'relative' },
                            { path: 'household.unknown.path', pathType: 'absolute' }
                        ]
                    }
                }
            }).getWidgetConfigs()['invalidFieldsGeography'] as InputMapFindPlaceType;

            expect(
                widgetConfigWithInvalidFields.geocodingQueryString!(
                    interviewAttributesForTestCases,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
                )
            ).toBeUndefined();
        });
    });
});
