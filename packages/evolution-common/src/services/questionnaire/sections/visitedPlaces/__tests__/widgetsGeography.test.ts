/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import  i18n from 'i18next';
import config from '../../../../../config/project.config';
import { interviewAttributesForTestCases, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import { InputMapFindPlaceType, InputStringType, QuestionWidgetConfig } from '../../../types';
import { loopActivities } from '../../../../odSurvey/types';
import { VisitedPlaceGeographyWidgetFactory } from '../widgetsGeography';
import { getActivityMarkerIcon } from '../activityIconMapping';
import { homeGeographyCoordinates, shoppingPlace1P2Coordinates } from '../../../../../tests/surveys/testCasesInterview';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true
};

const setActiveVisitedPlace = (
    interview: typeof interviewAttributesForTestCases,
    personId: string | null,
    journeyId: string | null,
    visitedPlaceId: string | null
) => {
    setResponse(interview, '_activePersonId', personId);
    setResponse(interview, '_activeJourneyId', journeyId);
    setResponse(interview, '_activeVisitedPlaceId', visitedPlaceId);
};

describe('VisitedPlaceGeographyWidgetFactory', () => {
    test('should return expected location widgets configuration', () => {
        const widgetConfig = new VisitedPlaceGeographyWidgetFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ).getWidgetConfigs();

        expect(widgetConfig).toEqual({
            visitedPlaceName: {
                type: 'question',
                inputType: 'string',
                path: 'name',
                datatype: 'string',
                twoColumns: false,
                containsHtml: true,
                label: expect.any(Function),
                conditional: expect.any(Function),
                validations: expect.any(Function),
                defaultValue: undefined,
                maxLength: undefined,
                placeholder: undefined,
                joinWith: 'visitedPlaceGeography',
                textTransform: undefined
            },
            visitedPlaceGeography: {
                type: 'question',
                inputType: 'mapFindPlace',
                path: 'geography',
                datatype: 'geojson',
                twoColumns: false,
                containsHtml: true,
                label: expect.any(Function),
                height: '32rem',
                defaultCenter: expect.any(Function),
                defaultZoom: undefined,
                maxZoom: undefined,
                icon: {
                    url: expect.any(Function),
                    size: [70, 70]
                },
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
                invalidGeocodingResultTypes: expect.any(Array),
                refreshGeocodingLabel: expect.any(Function),
                defaultValue: undefined,
                updateDefaultValueWhenResponded: undefined,
                validations: expect.any(Function),
                conditional: expect.any(Function)
            }
        });
    });
});

describe('visitedPlaceName widget', () => {
    const widgetConfig = new VisitedPlaceGeographyWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlaceName'] as QuestionWidgetConfig & InputStringType;

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe('label', () => {
        const label = widgetConfig.label;

        test('should include example help text when i18n key exists and activity is set', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((key: string) => key);
            jest.spyOn(i18n, 'exists').mockReturnValue(true);

            const result = translateString(
                label,
                { t: mockedT } as any,
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name'
            );

            expect(result).toContain('visitedPlaces:LocationNameAddress');
            expect(result).toContain('survey:forExampleAbbreviation');
            expect(result).toContain('visitedPlaces:LocationNameAddressExample');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:LocationNameAddress');
            expect(mockedT).toHaveBeenCalledWith('survey:forExampleAbbreviation');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:LocationNameAddressExample', { context: 'workUsual' });
        });

        test('should not include help text when i18n key does not exist', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((key: string) => key);
            jest.spyOn(i18n, 'exists').mockReturnValue(false);

            const result = translateString(
                label,
                { t: mockedT } as any,
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name'
            );

            expect(result).toEqual('visitedPlaces:LocationNameAddress ');
            expect(mockedT).toHaveBeenCalledTimes(1);
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:LocationNameAddress');
        });

        test('should not include help text when activity is blank', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((key: string) => key);
            jest.spyOn(i18n, 'exists').mockReturnValue(true);
            setResponse(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity',
                undefined
            );

            const result = translateString(
                label,
                { t: mockedT } as any,
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name'
            );

            expect(result).toEqual('visitedPlaces:LocationNameAddress ');
            expect(mockedT).toHaveBeenCalledTimes(1);
        });
    });

    describe('conditional', () => {
        const conditional = widgetConfig.conditional;

        test('should hide widget and return usual work place name for workUsual activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
            // Add the person's usual work place
            (interview.response.household!.persons!.personId1 as any).usualWorkPlace = { name: 'My usual work place' };

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name'
                )
            ).toEqual([false, 'My usual work place']);
        });

        test('should hide widget and return usual school place name for schoolUsual activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveVisitedPlace(interview, 'personId3', 'journeyId3', 'schoolPlace1P3');
            // Set the person's usual school place
            (interview.response.household!.persons!.personId3 as any).usualSchoolPlace = {
                name: 'My usual school place'
            };

            expect(
                conditional!(
                    interview,
                    'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3.name'
                )
            ).toEqual([false, 'My usual school place']);
        });

        test('should hide widget for home activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.name'
                )
            ).toEqual([false, null]);
        });

        test.each(loopActivities)('should hide widget for loop activity %s', (activity) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity',
                activity
            );

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.name'
                )
            ).toEqual([false, null]);
        });

        test('should show widget for non-home non-loop activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.name'
                )
            ).toEqual([true, null]);
        });

        test('should show widget for workUsual activity, but no usual work place set', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
            // Set the person's usual work place to undefined
            (interview.response.household!.persons!.personId1 as any).usualWorkPlace = undefined;

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name'
                )
            ).toEqual([true, null]);
        });
    });

    describe('validations', () => {
        const validations = widgetConfig.validations;

        test('should require non-blank value', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const validationResult = validations!(undefined, null, interview, 'path');

            expect(validationResult).toEqual([
                {
                    validation: true,
                    errorMessage: expect.any(Function)
                }
            ]);
        });

        test('should not return error for non-blank value and use correct translation key', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const validationResult = validations!('A place name', null, interview, 'path');
            expect(validationResult[0].validation).toBe(false);

            const mockedT = jest.fn();
            translateString(validationResult[0].errorMessage, { t: mockedT } as any, interview, 'path');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:activityNameIsRequiredError');
        });
    });
});

describe('visitedPlaceGeography widget', () => {
    const widgetConfig = new VisitedPlaceGeographyWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlaceGeography'] as QuestionWidgetConfig & InputMapFindPlaceType;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('label should use the right translation key', () => {
        const mockedT = jest.fn();
        const interview = _cloneDeep(interviewAttributesForTestCases);

        translateString(widgetConfig.label, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:geography');
    });

    test('refreshGeocodingLabel should use the right translation key', () => {
        const mockedT = jest.fn();
        const interview = _cloneDeep(interviewAttributesForTestCases);

        translateString(widgetConfig.refreshGeocodingLabel, { t: mockedT } as any, interview, 'path');
        expect(mockedT).toHaveBeenCalledWith('visitedPlaces:refreshGeocodingButton');
    });

    describe('icon.url', () => {
        test('should return marker icon for the activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const iconUrl = widgetConfig.icon!.url as any;

            expect(
                iconUrl(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
                )
            ).toEqual(getActivityMarkerIcon('workUsual'));
        });

        test('should return default marker icon when activity is missing', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.activity',
                undefined
            );
            const iconUrl = widgetConfig.icon!.url as any;

            expect(
                iconUrl(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
                )
            ).toEqual(getActivityMarkerIcon(undefined));
        });
    });

    describe('defaultCenter', () => {
        const defaultCenter = widgetConfig.defaultCenter as any;

        test('should use active previous visited place geography if no geography and a previous place exists', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Coordinates are those of shoppingPlace1P2
            const expectedCoordinates = shoppingPlace1P2Coordinates;
            setActiveVisitedPlace(interview, 'personId2', 'journeyId2', 'otherWorkPlace1P2');

            expect(defaultCenter(interview, 'path')).toEqual({ lat: expectedCoordinates[1], lon: expectedCoordinates[0] });
        });

        test('should use home geography when active place has no previous visited place', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            // Delete first home place for person 1
            delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1;
            // Coordinates are those of home
            const expectedCoordinates = homeGeographyCoordinates;
            setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'homePlace1P1');

            expect(defaultCenter(interview, 'path')).toEqual({ lat: expectedCoordinates[1], lon: expectedCoordinates[0] });
        });

        test('should fallback to default map center when no home geography is available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'homePlace1P1');
            // Set place geography to undefined
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.geography', undefined);
            setResponse(interview, 'home.geography.geometry.coordinates', undefined);

            expect(defaultCenter(interview, 'path')).toEqual(config.mapDefaultCenter);
        });
    });

    describe('validations', () => {
        const validations = widgetConfig.validations;
        const mockedT = jest.fn().mockImplementation((key: string) => key);

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should require geography for non-home non-loop activities', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            setResponse(interview, path.replace('.geography', '.activity'), 'shopping');
            // Set geography to undefined
            setResponse(interview, path, undefined);

            const validationResult = validations!(undefined, null, interview, path);
            expect(validationResult[0].validation).toBe(true);
            expect(translateString(validationResult[0].errorMessage, { t: mockedT } as any, interview, path)).toBe('visitedPlaces:locationIsRequiredError');
        });

        test.each(['home', ...loopActivities])('should not require geography for %s activity', (activity) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            setResponse(interview, path.replace('.geography', '.activity'), activity);
            // Set geography to undefined
            setResponse(interview, path, undefined);

            const validationResult = validations!(undefined, null, interview, path);
            expect(validationResult[0].validation).toBe(false);
        });

        test('should flag imprecise location when mapClicked and zoom is below 15', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            // Set geography at zoom 14 with mapClicked action
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: { lastAction: 'mapClicked', zoom: 14 }
            };
            setResponse(interview, path, geography);
            setResponse(interview, path.replace('.geography', '.activity'), 'shopping');

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[1].validation).toBe(true);
            expect(translateString(validationResult[1].errorMessage, { t: mockedT } as any, interview, path)).toBe('visitedPlaces:locationIsNotPreciseError');
        });

        test('should flag imprecise location when markerDragged and zoom is below 15', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: { lastAction: 'markerDragged', zoom: 10 }
            };
            setResponse(interview, path, geography);
            setResponse(interview, path.replace('.geography', '.activity'), 'shopping');

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[1].validation).toBe(true);
            expect(translateString(validationResult[1].errorMessage, { t: mockedT } as any, interview, path)).toBe('visitedPlaces:locationIsNotPreciseError');
        });

        test('should not flag zoom precision error when zoom is 15 or more', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: { lastAction: 'mapClicked', zoom: 15 }
            };
            setResponse(interview, path, geography);
            setResponse(interview, path.replace('.geography', '.activity'), 'shopping');

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[1].validation).toBe(false);
        });

        test('should flag geocoding imprecision and pass geocoding text to translation', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: {
                    isGeocodingImprecise: true,
                    geocodingQueryString: 'Main street'
                }
            };
            setResponse(interview, path, geography);

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[2].validation).toBe(true);

            
            translateString(validationResult[2].errorMessage, { t: mockedT } as any, interview, path);
            expect(mockedT).toHaveBeenCalledWith('survey:geography.geocodingStringImpreciseError', {
                geocodingTextInput: 'Main street',
                interpolation: { escapeValue: true }
            });
        });

        test('should pass empty geocoding text when not available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography';
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: {
                    isGeocodingImprecise: true
                }
            };
            setResponse(interview, path, geography);

            const validationResult = validations!(geography, null, interview, path);

            const mockedT = jest.fn();
            translateString(validationResult[2].errorMessage, { t: mockedT } as any, interview, path);
            expect(mockedT).toHaveBeenCalledWith('survey:geography.geocodingStringImpreciseError', {
                geocodingTextInput: '',
                interpolation: { escapeValue: true }
            });
        });
    });

    describe('conditional', () => {
        const conditional = widgetConfig.conditional;

        test('should hide widget and return usual work place geography for workUsual activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveVisitedPlace(interview, 'personId1', 'journeyId1', 'workPlace1P1');
            const usualWorkPlaceGeography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-72.9, 46.2] },
                properties: { lastAction: 'mapClicked' }
            };
            (interview.response.household!.persons!.personId1 as any).usualWorkPlace = {
                geography: usualWorkPlaceGeography
            };

            const conditionalResult = conditional!(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
            );
            expect(conditionalResult).toEqual([false, usualWorkPlaceGeography]);
            // Should return a clone of the usual work place geography, not the same object
            expect((conditionalResult as [boolean, unknown])[1]).not.toBe(usualWorkPlaceGeography);
        });

        test('should hide widget and return usual school place geography for schoolUsual activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveVisitedPlace(interview, 'personId3', 'journeyId3', 'schoolPlace1P3');
            const usualSchoolPlaceGeography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-71.6, 46.7] },
                properties: { lastAction: 'mapClicked' }
            };
            (interview.response.household!.persons!.personId3 as any).usualSchoolPlace = {
                geography: usualSchoolPlaceGeography
            };

            const conditionalResult = conditional!(
                interview,
                'household.persons.personId3.journeys.journeyId3.visitedPlaces.schoolPlace1P3.geography'
            )
            expect(conditionalResult).toEqual([false, usualSchoolPlaceGeography]);
            // Should return a clone of the usual school place geography, not the same object
            expect((conditionalResult as [boolean, unknown])[1]).not.toBe(usualSchoolPlaceGeography);
        });

        test('should hide widget for home activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.geography'
                )
            ).toEqual([false, null]);
        });

        test.each(loopActivities)('should hide widget for loop activity %s', (activity) => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.activity',
                activity
            );

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography'
                )
            ).toEqual([false, null]);
        });

        test('should show widget for non-home non-loop activity', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(
                conditional!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography'
                )
            ).toEqual([true, null]);
        });
    });

    describe('geocodingQueryString', () => {
        const geocodingQueryString = widgetConfig.geocodingQueryString;

        test('should use in-group name field for geocoding query', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(
                geocodingQueryString!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.geography'
                )
            ).toEqual('This is my work');
        });

        test('should return undefined when name is not available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);

            expect(
                geocodingQueryString!(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1.geography'
                )
            ).toBeUndefined();
        });
    });
});
