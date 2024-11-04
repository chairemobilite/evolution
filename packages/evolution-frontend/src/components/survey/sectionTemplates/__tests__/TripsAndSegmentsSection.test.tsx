/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import _cloneDeep from 'lodash/cloneDeep';
import SegmentsSection from '../TripsAndSegmentsSection';
import TestRenderer from 'react-test-renderer';
import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

import { secondsSinceMidnightToTimeStrWithSuffix } from '../../../../services/display/frontendHelper';
import { SectionProps, useSectionTemplate } from '../../../hooks/useSectionTemplate';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

jest.mock('chaire-lib-frontend/lib/components/pages/LoadingPage', () => () => <div>Loading...</div>);
jest.mock('../../Widget', () => ({
    Widget: (props) => <div>Widget {props.currentWidgetShortname}</div>
}));
jest.mock('../../GroupWidgets', () => ({
    GroupedObject: () => <div>GroupedObject</div>
}));
jest.mock('../../../../services/display/frontendHelper', () => ({
    secondsSinceMidnightToTimeStrWithSuffix: jest.fn().mockReturnValue('timeStr')
}));
const mockedSecondsSinceMidnightToTimeStrWithSuffix = secondsSinceMidnightToTimeStrWithSuffix as jest.MockedFunction<typeof secondsSinceMidnightToTimeStrWithSuffix>;

// Mock the odSurveyHelper
jest.mock('evolution-common/lib/services/odSurvey/helpers', () => ({
    getActivePerson: jest.fn(),
    getJourneysArray: jest.fn(),
    getActiveTrip: jest.fn(),
    getNextVisitedPlace: jest.fn()
}));
const mockedGetActivePerson = odSurveyHelper.getActivePerson as jest.MockedFunction<typeof odSurveyHelper.getActivePerson>;
const mockedGetJourneysArray = odSurveyHelper.getJourneysArray as jest.MockedFunction<typeof odSurveyHelper.getJourneysArray>;
const mockedGetActiveTrip = odSurveyHelper.getActiveTrip as jest.MockedFunction<typeof odSurveyHelper.getActiveTrip>;
const mockedGetNextVisitedPlace = odSurveyHelper.getNextVisitedPlace as jest.MockedFunction<typeof odSurveyHelper.getNextVisitedPlace>;
// Return default values
mockedGetActivePerson.mockReturnValue({ _uuid: 'person1', _sequence: 1 });
mockedGetJourneysArray.mockReturnValue([]);
mockedGetActiveTrip.mockReturnValue(null);
mockedGetNextVisitedPlace.mockReturnValue(null);

// FIXME Get the trips widgets from somewhere when they are moved to evolution
const surveyContext = {
    widgets: {
        segmentMode: {
            choices: [
                { value: 'walk', label: () => 'Walk', iconPath: '/dist/images/modes_icons/walk.png' },
                { value: 'carDriver', label: () => 'Car driver', iconPath: '/dist/images/modes_icons/carDriver.png' }
            ]
        },
        personTrips: {},
        activePersonTitle: {},
        personTripsTitle: {},
        buttonSwitchPerson: {},
        personVisitedPlacesMap: {},
        buttonConfirmNextSection: {}
    }
};
// Mock the HOC
jest.mock('../../../hoc/WithSurveyContextHoc', () => ({
    withSurveyContext: (Component: React.ComponentType) => (props: any) => <Component {...props} surveyContext={surveyContext} />
}));

jest.mock('../../../hooks/useSectionTemplate', () => ({
    useSectionTemplate: jest.fn().mockReturnValue({ preloaded: true })
}));
const mockedUseSectionTemplate = useSectionTemplate as jest.MockedFunction<typeof useSectionTemplate>;

let props: SectionProps;

beforeEach(() => {
    jest.clearAllMocks();
    props = {
        shortname: 'testShortname',
        sectionConfig: {
            widgets: ['activePersonTitle', 'buttonSwitchPerson', 'personTripsTitle', 'personTrips', 'personVisitedPlacesMap', 'buttonConfirmNextSection']
        },
        interview: {
            responses: {}
        } as any,
        errors: {},
        user: {
            id: 1
        } as any,
        loadingState: 0,
        startUpdateInterview: jest.fn(),
        startAddGroupedObjects: jest.fn(),
        startRemoveGroupedObjects: jest.fn()
    };
});

// Initialize test data
const trips = {
    trip1: {
        _uuid: 'trip1',
        _sequence: 1,
        _originVisitedPlaceUuid: 'place1',
        _destinationVisitedPlaceUuid: 'place2',
        segments: {
            segment1: {
                _uuid: 'segment1',
                _sequence: 1,
                _isNew: false,
                mode: 'walk' as const
            }
        }
    },
    trip2: {
        _uuid: 'trip2',
        _sequence: 2,
        _originVisitedPlaceUuid: 'place2',
        _destinationVisitedPlaceUuid: 'place3'
    }
};

const visitedPlaces = {
    place1: {
        _uuid: 'place1',
        _sequence: 1,
        activity: 'activity1',
        name: 'Lieu 1',
        departureTime: 3600
    },
    place2: {
        _uuid: 'place2',
        _sequence: 2,
        activity: 'activity2',
        arrivalTime: 7200
    },
    place3: {
        _uuid: 'place3',
        _sequence: 3,
        activity: 'activity3',
        arrivalTime: 10800
    }
};

const journey = {
    _uuid: 'journey1',
    _sequence: 1,
    trips,
    visitedPlaces
};


describe('SegmentsSection UI display', () => {

    it('should render LoadingPage when not preloaded', () => {
        mockedUseSectionTemplate.mockReturnValueOnce({ preloaded: false });
        const wrapper = TestRenderer.create(
            <SegmentsSection {...props} />
        );
        expect(wrapper).toMatchSnapshot();
    });

    describe('SegmentsSection with trips and visited places', () => {

        test('should render list of trips and map when no trip selected', () => {
            mockedGetJourneysArray.mockReturnValueOnce([journey]);
            const wrapper = TestRenderer.create(
                <SegmentsSection {...props} />
            );
            expect(wrapper).toMatchSnapshot();
        });

        test('make sure widget is accessible without trip selected', async () => {
            mockedGetJourneysArray.mockReturnValueOnce([journey]);
            const { container } = render(
                <SegmentsSection {...props} />
            );
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        test('should render list of trips with selected trip widget when trip selected', () => {
            mockedGetJourneysArray.mockReturnValueOnce([journey]);
            mockedGetActiveTrip.mockReturnValueOnce(trips.trip1);
            const wrapper = TestRenderer.create(
                <SegmentsSection {...props} />
            );
            expect(wrapper).toMatchSnapshot();
        });

        test('make sure widget is accessible with trip selected', async () => {
            mockedGetJourneysArray.mockReturnValueOnce([journey]);
            mockedGetActiveTrip.mockReturnValueOnce(trips.trip1);
            const { container } = render(
                <SegmentsSection {...props} />
            );
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        test('should render list of trips when loop activity in one trip, no trip selected', () => {
            const testVisitedPlaces = _cloneDeep(visitedPlaces);
            testVisitedPlaces.place2.activity = 'workOnTheRoad';
            mockedGetJourneysArray.mockReturnValueOnce([{ ...journey, visitedPlaces: testVisitedPlaces }]);
            mockedGetNextVisitedPlace.mockReturnValueOnce(testVisitedPlaces.place3);
            const wrapper = TestRenderer.create(
                <SegmentsSection {...props} />
            );
            expect(wrapper).toMatchSnapshot();
        });

        test('should render list of trips when loop activity is the first visited place, no trip selected', () => {
            const testVisitedPlaces = _cloneDeep(visitedPlaces);
            testVisitedPlaces.place1.activity = 'workOnTheRoad';
            mockedGetJourneysArray.mockReturnValueOnce([{ ...journey, visitedPlaces: testVisitedPlaces }]);
            mockedGetNextVisitedPlace.mockReturnValueOnce(testVisitedPlaces.place2);
            const wrapper = TestRenderer.create(
                <SegmentsSection {...props} />
            );
            expect(wrapper).toMatchSnapshot();
        });

    });

    it('should throw error if no active person', () => {
        mockedGetActivePerson.mockReturnValueOnce(null);
        expect(() => TestRenderer.create(
            <SegmentsSection {...props} />
        )).toThrow('SegmentsSection: active person not found');
    });

    it('should throw error if no active person', () => {
        mockedGetJourneysArray.mockReturnValueOnce([]);
        expect(() => TestRenderer.create(
            <SegmentsSection {...props} />
        )).toThrow('SegmentsSection: there are no journeys');
    });

    it('should throw error if no a trip has no origin or destination', () => {
        const trips = {
            trip1: {
                _uuid: 'trip1',
                _sequence: 1,
                segments: {
                    segment1: {
                        _uuid: 'segment1',
                        _sequence: 1,
                        _isNew: false,
                        mode: 'walk' as const
                    }
                }
            },
        };

        const journey = {
            _uuid: 'journey1',
            _sequence: 1,
            trips
        };
        mockedGetJourneysArray.mockReturnValueOnce([journey]);
        expect(() => TestRenderer.create(
            <SegmentsSection {...props} />
        )).toThrow('SegmentsSection: origin or destination not found');
    });
});

describe('SegmentsSection behavior', () => {

    test('Click on the trip edit button for first trip', () => {
        mockedGetJourneysArray.mockReturnValueOnce([journey]);
        const { getAllByTitle } = render(
            <SegmentsSection {...props} />
        );
        // Find the edit button
        const editButtons = getAllByTitle("trip.editTrip");
        expect(editButtons).toBeTruthy();
        const editButton = editButtons[0];

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        fireEvent.click(editButton!);
        expect(props.startUpdateInterview).toHaveBeenCalledWith('segments', {
            ['responses._activeTripId']: 'trip1'
        });
    });

    test('Click on the trip edit button for second trip', () => {
        mockedGetJourneysArray.mockReturnValueOnce([journey]);
        const { getAllByTitle } = render(
            <SegmentsSection {...props} />
        );
        // Find the edit button
        const editButtons = getAllByTitle("trip.editTrip");
        expect(editButtons).toBeTruthy();
        const editButton = editButtons[1];

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        fireEvent.click(editButton!);
        expect(props.startUpdateInterview).toHaveBeenCalledWith('segments', {
            ['responses._activeTripId']: 'trip2'
        });
    });
    
});
