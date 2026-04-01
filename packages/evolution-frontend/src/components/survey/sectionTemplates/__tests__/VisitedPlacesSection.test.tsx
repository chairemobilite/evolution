/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import _cloneDeep from 'lodash/cloneDeep';
import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

import VisitedPlacesSection from '../VisitedPlacesSection';
import { type SectionProps, useSectionTemplate } from '../../../hooks/useSectionTemplate';
import type { WidgetProps } from '../../Widget';
import { SurveyContext } from '../../../../contexts/SurveyContext';
import { interviewAttributesForTestCases } from 'evolution-common/lib/tests/surveys';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';

expect.extend(toHaveNoViolations);

jest.mock('chaire-lib-frontend/lib/components/pages/LoadingPage', () => () => <div>Loading...</div>);
jest.mock('chaire-lib-frontend/lib/components/modal/ConfirmModal', () => (props: any) =>
    props.isOpen ? (
        <div>
            <div>{props.title}</div>
            <div>{props.text}</div>
            <button onClick={props.confirmAction} type="button">
                confirm
            </button>
            <button onClick={props.closeModal} type="button">
                cancel
            </button>
        </div>
    ) : null
);
jest.mock('../../Widget', () => ({
    Widget: (props: WidgetProps) => <div>Widget {props.currentWidgetShortname}</div>
}));
jest.mock('../../GroupWidgets', () => ({
    GroupedObject: (props: { objectId: string }) => <div>GroupedObject {props.objectId}</div>
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { nickname?: string; _sequence?: number }) => {
            if (key === 'visitedPlaces:dayScheduleFor') {
                return `Schedule for ${options?.nickname || ''}`;
            }
            return key;
        },
        i18n: {}
    })
}));
jest.mock('../../../../services/display/frontendHelper', () => ({
    getVisitedPlaceDescription: jest.fn().mockReturnValue('visitedPlaceDescription'),
    secondsSinceMidnightToTimeStrWithSuffix: jest.fn((seconds: number) => `time-${seconds}`)
}));

jest.mock('evolution-common/lib/services/odSurvey/helpers', () => {
    const originalModule = jest.requireActual('evolution-common/lib/services/odSurvey/helpers');

    return {
        ...originalModule,
        addVisitedPlace: jest.fn(),
        deleteVisitedPlace: jest.fn()
    };
});
jest.mock('../../../hooks/useSectionTemplate', () => ({
    useSectionTemplate: jest.fn().mockReturnValue({ preloaded: true })
}));

const mockedUseSectionTemplate = useSectionTemplate as jest.MockedFunction<typeof useSectionTemplate>;
const mockedAddVisitedPlace = odSurveyHelper.addVisitedPlace as jest.MockedFunction<typeof odSurveyHelper.addVisitedPlace>;
const mockedDeleteVisitedPlace = odSurveyHelper.deleteVisitedPlace as jest.MockedFunction<typeof odSurveyHelper.deleteVisitedPlace>;

const surveyContext = {
    sections: {},
    widgets: {
        personVisitedPlaces: {
            deleteConfirmPopup: {
                title: 'Delete visited place',
                content: 'Confirm deletion',
                containsHtml: false
            }
        },
        activePersonTitle: {},
        buttonSwitchPerson: {},
        personVisitedPlacesTitle: {},
        personVisitedPlacesMap: {},
        buttonVisitedPlacesConfirmNextSection: {}
    },
    devMode: false,
    dispatch: jest.fn()
};

const TestContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SurveyContext.Provider value={surveyContext}>{children}</SurveyContext.Provider>
);

const getDefaultInterview = () => {
    const interview = _cloneDeep(interviewAttributesForTestCases) as any;
    interview.response._activePersonId = 'personId1';
    interview.response._activeJourneyId = 'journeyId1';
    interview.allWidgetsValid = true;
    return interview;
};

const getDefaultProps = (): SectionProps => ({
    shortname: 'visitedPlaces',
    sectionConfig: {
        previousSection: null,
        nextSection: null,
        widgets: [
            'activePersonTitle',
            'buttonSwitchPerson',
            'personVisitedPlacesTitle',
            'personVisitedPlacesMap',
            'buttonVisitedPlacesConfirmNextSection'
        ]
    },
    interview: getDefaultInterview(),
    errors: {},
    user: {
        id: 1
    } as any,
    loadingState: 0,
    startUpdateInterview: jest.fn(),
    startAddGroupedObjects: jest.fn(),
    startRemoveGroupedObjects: jest.fn(),
    startNavigate: jest.fn()
});

describe('VisitedPlacesSection UI display', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render LoadingPage when not preloaded', () => {
        mockedUseSectionTemplate.mockReturnValueOnce({ preloaded: false });
        const props = getDefaultProps();
        const { container } = render(
            <TestContextProvider>
                <VisitedPlacesSection {...props} />
            </TestContextProvider>
        );
        expect(container).toMatchSnapshot();
    });

    test('should render the default visited places list and map', () => {
        const props = getDefaultProps();
        const { container, getByText } = render(
            <TestContextProvider>
                <VisitedPlacesSection {...props} />
            </TestContextProvider>
        );

        expect(getByText('Widget personVisitedPlacesMap')).toBeTruthy();
        expect(getByText('Widget buttonVisitedPlacesConfirmNextSection')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    test('make sure widget is accessible with no selected visited place', async () => {
        const props = getDefaultProps();
        const { container } = render(
            <TestContextProvider>
                <VisitedPlacesSection {...props} />
            </TestContextProvider>
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    test('should render the selected visited place grouped object', () => {
        const props = getDefaultProps();
        props.interview.response._activeVisitedPlaceId = 'workPlace1P1';
        const { container, getByText, queryByText } = render(
            <TestContextProvider>
                <VisitedPlacesSection {...props} />
            </TestContextProvider>
        );

        expect(getByText('GroupedObject workPlace1P1')).toBeTruthy();
        expect(queryByText('Widget personVisitedPlacesMap')).toBeNull();
        expect(container).toMatchSnapshot();
    });

    test('should throw error if no active person or journey', () => {
        const props = getDefaultProps();
        delete props.interview.response._activePersonId;
        delete props.interview.response._activeJourneyId;

        expect(() =>
            render(
                <TestContextProvider>
                    <VisitedPlacesSection {...props} />
                </TestContextProvider>
            )
        ).toThrow('Person or current journey not found for visited places section');
    });
});

describe('VisitedPlacesSection behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test.each([
        ['first visited place', 0, 'homePlace1P1'],
        ['last visited place', 4, 'otherPlace2P1']
    ])('click on the edit button for %s', (_label, buttonIndex, expectedVisitedPlaceId) => {
        const props = getDefaultProps();
        const { getAllByTitle } = render(
            <TestContextProvider>
                <VisitedPlacesSection {...props} />
            </TestContextProvider>
        );

        const editButtons = getAllByTitle('visitedPlaces:editVisitedPlace');
        fireEvent.click(editButtons[buttonIndex]);

        expect(props.startUpdateInterview).toHaveBeenCalledWith({
            sectionShortname: 'visitedPlaces',
            valuesByPath: { ['response._activeVisitedPlaceId']: expectedVisitedPlaceId }
        });
    });

    test.each([
        ['insert button', () => getDefaultProps(), 'visitedPlaces:insertVisitedPlace', 0, 2],
        [
            'footer add button',
            () => {
                const props = getDefaultProps();
                props.interview.response.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces!.otherPlace2P1.nextPlaceCategory =
                    'visitedAnotherPlace';
                return props;
            },
            'visitedPlaces:addVisitedPlace',
            0,
            -1
        ]
    ])(
        'click on the %s calls addVisitedPlace helper',
        (_label, getProps, buttonTitle, buttonIndex, expectedSequence) => {
            const props = getProps();
            const { getAllByTitle } = render(
                <TestContextProvider>
                    <VisitedPlacesSection {...props} />
                </TestContextProvider>
            );

            const buttons = getAllByTitle(buttonTitle);
            fireEvent.click(buttons[buttonIndex]);

            expect(mockedAddVisitedPlace).toHaveBeenCalledWith(
                expect.objectContaining({
                    insertSequence: expectedSequence,
                    person: expect.objectContaining({ _uuid: 'personId1' }),
                    journey: expect.objectContaining({ _uuid: 'journeyId1' }),
                    startUpdateInterview: props.startUpdateInterview,
                    startAddGroupedObjects: props.startAddGroupedObjects
                })
            );
        }
    );

    test('click on the delete button and confirm calls deleteVisitedPlace helper', () => {
        const props = getDefaultProps();
        const { getAllByTitle, getByText } = render(
            <TestContextProvider>
                <VisitedPlacesSection {...props} />
            </TestContextProvider>
        );

        const deleteButtons = getAllByTitle('visitedPlaces:deleteVisitedPlace');
        fireEvent.click(deleteButtons[0]);
        fireEvent.click(getByText('confirm'));

        expect(mockedDeleteVisitedPlace).toHaveBeenCalledWith(
            expect.objectContaining({
                interview: props.interview,
                person: expect.objectContaining({ _uuid: 'personId1' }),
                journey: expect.objectContaining({ _uuid: 'journeyId1' }),
                visitedPlace: expect.objectContaining({ _uuid: 'homePlace1P1' }),
                startUpdateInterview: props.startUpdateInterview,
                startRemoveGroupedObjects: props.startRemoveGroupedObjects
            })
        );
    });
});