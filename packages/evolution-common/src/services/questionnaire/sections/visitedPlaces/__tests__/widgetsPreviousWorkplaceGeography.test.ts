/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import i18n from 'i18next';
import config from '../../../../../config/project.config';
import { interviewAttributesForTestCases, setActiveSurveyObjects, widgetFactoryOptions } from '../../../../../tests/surveys';
import { setResponse, translateString } from '../../../../../utils/helpers';
import { InputMapFindPlaceType, InputStringType, QuestionWidgetConfig } from '../../../types';
import { homeGeographyCoordinates, shoppingPlace1P2Coordinates } from '../../../../../tests/surveys/testCasesInterview';
import { PreviousWorkPlaceGeographyWidgetFactory } from '../widgetsPreviousWorkplaceGeography';
import { getActivityMarkerIcon } from '../activityIconMapping';
import { initializeVisitedPlaceSectionHelpers } from '../helpers';

const visitedPlacesSectionConfig = {
    type: 'visitedPlaces' as const,
    enabled: true,
    inlineUsualPlacesEntry: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60,
    tripDiaryMaxTimeOfDay: 28 * 60 * 60
};

beforeAll(() => {
    // initialize the visited place section helpers with the inline version
    initializeVisitedPlaceSectionHelpers(visitedPlacesSectionConfig);
});

describe('PreviousWorkPlaceGeographyWidgetFactory', () => {
    test('should return expected location widgets configuration', () => {
        const widgetConfig = new PreviousWorkPlaceGeographyWidgetFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ).getWidgetConfigs();

        expect(Object.keys(widgetConfig).sort()).toEqual(['visitedPlacePreviousWorkPlaceGeography', 'visitedPlacePreviousWorkPlaceName']);

        const nameWidget = widgetConfig.visitedPlacePreviousWorkPlaceName as QuestionWidgetConfig & InputStringType;
        expect(nameWidget.path).toBe('_previousWorkPlace.name');
        expect(nameWidget.conditional).toEqual(expect.any(Function));
        expect(nameWidget.validations).toEqual(expect.any(Function));

        const geographyWidget = widgetConfig.visitedPlacePreviousWorkPlaceGeography as QuestionWidgetConfig & InputMapFindPlaceType;
        expect(geographyWidget.path).toBe('_previousWorkPlace.geography');
        expect(geographyWidget.conditional).toEqual(expect.any(Function));
        expect(geographyWidget.validations).toEqual(expect.any(Function));
    });
});

describe('visitedPlacePreviousWorkPlaceName widget', () => {
    const widgetConfig = new PreviousWorkPlaceGeographyWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlacePreviousWorkPlaceName'] as QuestionWidgetConfig & InputStringType;

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe('label', () => {
        test('should include example help text when i18n key exists', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const mockedT = jest.fn().mockImplementation((key: string) => key);
            jest.spyOn(i18n, 'exists').mockReturnValue(true);

            const result = translateString(
                widgetConfig.label,
                { t: mockedT } as any,
                interview,
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1.name'
            );

            expect(result).toContain('visitedPlaces:visitedPlacePreviousWorkPlaceName');
            expect(result).toContain('survey:forExampleAbbreviation');
            expect(result).toContain('visitedPlaces:visitedPlaceNameExample');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:visitedPlacePreviousWorkPlaceName');
            expect(mockedT).toHaveBeenCalledWith('survey:forExampleAbbreviation');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:visitedPlaceNameExample', {
                context: 'workUsual_onTheRoadOften'
            });
        });
    });
    
    describe('conditional', () => {
        test('should return false when usual places are not inlined', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const widgetFactory = new PreviousWorkPlaceGeographyWidgetFactory(
                { ...visitedPlacesSectionConfig, inlineUsualPlacesEntry: false },
                widgetFactoryOptions
            );
            const conditional = widgetFactory.getWidgetConfigs()['visitedPlacePreviousWorkPlaceName'].conditional as any;

            expect(conditional(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._previousWorkPlace.name')).toBe(false);
        });

        test('should return false when the previous on-the-road activity is not workUsual', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const conditional = widgetConfig.conditional as any;
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'newPlace' });
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.newPlace = {
                _uuid: 'newPlace',
                _sequence: 6,
                activity: 'workOnTheRoad',
                onTheRoadPreviousPlaceActivity: 'home'
            };

            expect(
                conditional(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.name'
                )
            ).toBe(false);
        });

        test('should show the widget when the usual work place is not yet defined', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const conditional = widgetConfig.conditional as any;
            // Set the new place
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'newPlace' });
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.newPlace = {
                _uuid: 'newPlace',
                _sequence: 6,
                activity: 'workOnTheRoad',
                onTheRoadPreviousPlaceActivity: 'workUsual'
            };
            // Change activity of workPlace1P1 to be not 'workUsual'
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workNotUsual';

            expect(
                conditional(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.name'
                )
            ).toEqual(true);
        });

        test('should hide the widget and use the usual work place name when it is already defined', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const conditional = widgetConfig.conditional as any;
            // Set the new place
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'newPlace' });
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.newPlace = {
                _uuid: 'newPlace',
                _sequence: 6,
                activity: 'workOnTheRoad',
                onTheRoadPreviousPlaceActivity: 'workUsual'
            };

            // workPlace1P1 is a workUsual
            expect(
                conditional(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.name'
                )
            ).toEqual([false, interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.workPlace1P1.name]);
        });
    });

    describe('validations', () => {
        const validations = widgetConfig.validations as any;

        test('should require a non-blank value', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            
            const validationResult = validations(undefined, null, interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.name');
            expect(validationResult[0].validation).toBe(true);
        });
    });
});

describe('visitedPlacePreviousWorkPlaceGeography widget', () => {
    const widgetConfig = new PreviousWorkPlaceGeographyWidgetFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs()['visitedPlacePreviousWorkPlaceGeography'] as QuestionWidgetConfig & InputMapFindPlaceType;

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    describe('label', () => {
        test('should use the right translation key for the label', () => {
            const mockedT = jest.fn();
            const interview = _cloneDeep(interviewAttributesForTestCases);

            translateString(widgetConfig.label, { t: mockedT } as any, interview, 'path');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:visitedPlacePreviousWorkPlaceGeography');
        });

        test('should use the right translation key for geocoding refresh', () => {
            const mockedT = jest.fn();
            const interview = _cloneDeep(interviewAttributesForTestCases);

            translateString(widgetConfig.refreshGeocodingLabel, { t: mockedT } as any, interview, 'path');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:refreshGeocodingButton');
        });
    });

    test('should return marker icon for workUsual', () => {
        const icon = widgetConfig.icon;

        expect(icon).toEqual({
            url: getActivityMarkerIcon('workUsual'),
            size: [70, 70]
        });
    });

    describe('defaultCenter', () => {
        test('should use the previous visited place geography when available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setActiveSurveyObjects(interview, { personId: 'personId2', journeyId: 'journeyId2', visitedPlaceId: 'otherWorkPlace1P2' });
            const expectedCoordinates = shoppingPlace1P2Coordinates;

            expect(
                (widgetConfig.defaultCenter as any)(
                    interview,
                    'household.persons.personId2.journeys.journeyId2.visitedPlaces.otherWorkPlace1P2.geography'
                )
            ).toEqual({ lat: expectedCoordinates[1], lon: expectedCoordinates[0] });
        });

        test('should fall back to home geography when no previous visited place exists', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const expectedCoordinates = homeGeographyCoordinates;
            delete interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.homePlace1P1;
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'homePlace1P1' });

            expect(
                (widgetConfig.defaultCenter as any)(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.geography'
                )
            ).toEqual({ lat: expectedCoordinates[1], lon: expectedCoordinates[0] });
        });

        test('should return the default map center when no home geography is available', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            setResponse(interview, 'home.geography.geometry.coordinates', undefined);
            setResponse(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.geography', undefined);
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'homePlace1P1' });

            expect(
                (widgetConfig.defaultCenter as any)(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.homePlace1P1.geography'
                )
            ).toEqual(config.mapDefaultCenter);
        });
    });

    describe('conditional', () => {
        test('should return false when usual places are not inlined', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const widgetFactory = new PreviousWorkPlaceGeographyWidgetFactory(
                { ...visitedPlacesSectionConfig, inlineUsualPlacesEntry: false },
                widgetFactoryOptions
            );
            const conditional = widgetFactory.getWidgetConfigs()['visitedPlacePreviousWorkPlaceGeography'].conditional as any;

            expect(conditional(interview, 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1._previousWorkPlace.name')).toBe(false);
        });

        test('should return false when the previous on-the-road activity is not workUsual', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const conditional = widgetConfig.conditional as any;
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'newPlace' });
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.newPlace = {
                _uuid: 'newPlace',
                _sequence: 6,
                activity: 'workOnTheRoad',
                onTheRoadPreviousPlaceActivity: 'home'
            };

            expect(
                conditional(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.geography'
                )
            ).toBe(false);
        });

        test('should show the widget when the usual work place is not yet defined', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const conditional = widgetConfig.conditional as any;
            // Set the new place
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'newPlace' });
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.newPlace = {
                _uuid: 'newPlace',
                _sequence: 6,
                activity: 'workOnTheRoad',
                onTheRoadPreviousPlaceActivity: 'workUsual'
            };
            // Change activity of workPlace1P1 to be not 'workUsual'
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.workPlace1P1.activity = 'workNotUsual';

            expect(
                conditional(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.geography'
                )
            ).toEqual(true);
        });

        test('should hide the widget and use the usual work place name when it is already defined', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const conditional = widgetConfig.conditional as any;
            // Set the new place
            setActiveSurveyObjects(interview, { personId: 'personId1', journeyId: 'journeyId1', visitedPlaceId: 'newPlace' });
            interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.newPlace = {
                _uuid: 'newPlace',
                _sequence: 6,
                activity: 'workOnTheRoad',
                onTheRoadPreviousPlaceActivity: 'workUsual'
            };

            // workPlace1P1 is a workUsual
            expect(
                conditional(
                    interview,
                    'household.persons.personId1.journeys.journeyId1.visitedPlaces.newPlace._previousWorkPlace.geography'
                )
            ).toEqual([false, interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.workPlace1P1.geography]);
        });

    });

    describe('validations', () => {
        const validations = widgetConfig.validations!;
        const mockedT = jest.fn().mockImplementation((key: string) => key);

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should require a geography value', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousWorkPlace.geography';
            const validationResult = validations(undefined, null, interview, path);

            expect(validationResult[0].validation).toBe(true);
            expect(translateString(validationResult[0].errorMessage, { t: mockedT } as any, interview, path)).toBe('visitedPlaces:workPlaceLocationIsRequiredError');
        });

        test('should accept geography value', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const validationResult = validations(interview.response.household!.persons!.personId1!.journeys!.journeyId1.visitedPlaces!.workPlace1P1.geography, null, interview, 'path');

            expect(validationResult[0].validation).toBe(false);
        });

        test('should flag imprecise location when mapClicked and zoom is below 15', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousWorkPlace.geography';
            // Set geography at zoom 14 with mapClicked action
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: { lastAction: 'mapClicked', zoom: 14 }
            };
            setResponse(interview, path, geography);
            setResponse(interview, path.replace('._previousWorkPlace.geography', '.activity'), 'workOnTheRoad');

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[1].validation).toBe(true);
            expect(translateString(validationResult[1].errorMessage, { t: mockedT } as any, interview, path)).toBe('visitedPlaces:locationIsNotPreciseError');
        });

        test('should flag imprecise location when markerDragged and zoom is below 15', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousWorkPlace.geography';
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: { lastAction: 'markerDragged', zoom: 10 }
            };
            setResponse(interview, path, geography);
            setResponse(interview, path.replace('._previousWorkPlace.geography', '.activity'), 'workOnTheRoad');

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[1].validation).toBe(true);
            expect(translateString(validationResult[1].errorMessage, { t: mockedT } as any, interview, path)).toBe('visitedPlaces:locationIsNotPreciseError');
        });

        test('should not flag zoom precision error when zoom is 15 or more', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousWorkPlace.geography';
            const geography = {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.62, 45.54] },
                properties: { lastAction: 'mapClicked', zoom: 15 }
            };
            setResponse(interview, path, geography);
            setResponse(interview, path.replace('._previousWorkPlace.geography', '.activity'), 'workOnTheRoad');

            const validationResult = validations!(geography, null, interview, path);
            expect(validationResult[1].validation).toBe(false);
        });

        test('should flag geocoding imprecision and pass geocoding text to translation', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            const path =
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousWorkPlace.geography';
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
                'household.persons.personId1.journeys.journeyId1.visitedPlaces.otherPlaceP1._previousWorkPlace.geography';
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
});
