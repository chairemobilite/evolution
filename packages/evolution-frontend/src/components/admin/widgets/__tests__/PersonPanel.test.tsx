/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import type { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { PersonPanel } from '../PersonPanel';
import { SurveyObjectBox } from '../SurveyObjectBox';
import { getReviewDecisionStatusForObject } from '../../../../services/admin/reviewDecisionStatusHelper';
import { createRejectedReviewDecisionStatus } from '../../../../services/admin/__tests__/reviewDecisionStatusHelperTestUtils';
import type { InheritedReviewDisplayStatus } from '../../../../services/admin/reviewDecisionStatusHelper';

jest.mock('../../../../assets/images/admin/steering-wheel-solid.svg', () => 'steering-wheel.svg');

jest.mock('../../../../services/surveyObjectDecorators/VisitedPlaceDecorator', () => ({
    VisitedPlaceDecorator: jest.fn().mockImplementation(() => ({
        getDescription: () => 'visited place'
    }))
}));

jest.mock('../../AuditDisplay', () => ({
    __esModule: true,
    default: ({ audits }: { audits?: AuditForObject[] }) =>
        audits && audits.length > 0 ? <div>{audits.map((audit) => audit.errorCode).join(' ')}</div> : null
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultValue?: string) => defaultValue ?? key
    })
}));

jest.mock('../SurveyObjectBox', () => ({
    SurveyObjectBox: jest.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>)
}));

jest.mock('../../../../services/admin/useObjectReview', () => ({
    useReviewDecisionStatusByObject: jest.fn(() => ({}))
}));

jest.mock('../../../../services/admin/reviewDecisionStatusHelper');

const mockSurveyObjectBox = SurveyObjectBox as jest.MockedFunction<typeof SurveyObjectBox>;
const mockGetReviewDecisionStatusForObject = getReviewDecisionStatusForObject as jest.MockedFunction<
    typeof getReviewDecisionStatusForObject
>;
const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const journeyUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tripUuid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const segmentUuid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/**
 * A Trip between two partial places, with its times taken from the places as TripFactory does.
 */
const createTrip = ({
    startPlace,
    endPlace,
    segments
}: {
    startPlace: Partial<VisitedPlace>;
    endPlace: Partial<VisitedPlace>;
    segments: Partial<Segment>[];
}): Trip => {
    const trip = new Trip({ _uuid: tripUuid }, new SurveyObjectsRegistry());
    trip.startPlace = startPlace as VisitedPlace;
    trip.endPlace = endPlace as VisitedPlace;
    trip.segments = segments as Segment[];
    trip.setupStartAndEndTimes();
    return trip;
};

const person = { _uuid: personUuid } as Person;
const journey = {
    _uuid: journeyUuid,
    visitedPlaces: [],
    trips: [
        createTrip({
            startPlace: { endTime: 100 },
            endPlace: { startTime: 200 },
            segments: [{ _uuid: segmentUuid, mode: 'walk' }]
        })
    ]
} as unknown as Journey;

const rejectedStatus = createRejectedReviewDecisionStatus;

const getInheritedStatus = (objectType: string, objectUuid: string): string | undefined =>
    mockSurveyObjectBox.mock.calls.find(
        ([props]) => props.objectType === objectType && props.objectUuid === objectUuid
    )?.[0].inheritedStatus;

const renderPersonPanel = (inheritedStatus?: InheritedReviewDisplayStatus) =>
    render(
        <PersonPanel
            person={person}
            journey={journey}
            personId={personUuid}
            selectPlace={jest.fn()}
            selectTrip={jest.fn()}
            inheritedStatus={inheritedStatus}
        />
    );

beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewDecisionStatusForObject.mockReturnValue(undefined);
});

describe('PersonPanel transit stations', () => {
    test.each([
        {
            mode: 'transitRRT',
            segment: { stations: ['guyConcordia', 'berriUqam', 'montmorency'] },
            expected: 'interviewStats.labels.segment.stations: guyConcordia -> berriUqam -> montmorency'
        },
        {
            mode: 'transitRegionalRail',
            segment: { stations: ['Centrale', 'Lucien-L Allier'] },
            expected: 'interviewStats.labels.segment.stations: Centrale -> Lucien-L Allier'
        },
        {
            mode: 'transitLRRT',
            segment: { stations: ['Gare Centrale', 'Brossard'] },
            expected: 'interviewStats.labels.segment.stations: Gare Centrale -> Brossard'
        },
        {
            mode: 'transitRRT',
            segment: { stations: [] },
            expected: undefined
        }
    ])('$mode', ({ mode, segment, expected }) => {
        const journeyWithStations = {
            ...journey,
            trips: [
                createTrip({
                    startPlace: { endTime: 100 },
                    endPlace: { startTime: 200 },
                    segments: [{ _uuid: segmentUuid, mode, ...segment } as Partial<Segment>]
                })
            ]
        } as unknown as Journey;

        render(
            <PersonPanel
                person={person}
                journey={journeyWithStations}
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );

        if (expected === undefined) {
            expect(screen.queryByText(/interviewStats\.labels\.segment\.stations/)).toBeNull();
        } else {
            expect(screen.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
        }
    });
});

describe('PersonPanel car passenger driver', () => {
    const driverUuid = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const otherUuid = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

    const renderPassenger = (
        segment: { driverType?: string; driverUuid?: string },
        personIndexByUuid: { [personUuid: string]: number }
    ) => {
        const journeyWithPassenger = {
            ...journey,
            trips: [
                createTrip({
                    startPlace: { endTime: 100 },
                    endPlace: { startTime: 200 },
                    segments: [{ _uuid: segmentUuid, mode: 'carPassenger', ...segment } as Partial<Segment>]
                })
            ]
        } as unknown as Journey;

        render(
            <PersonPanel
                person={person}
                journey={journeyWithPassenger}
                personId={personUuid}
                personIndexByUuid={personIndexByUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );
    };

    test.each([
        {
            description: 'household member uses the person panel index',
            segment: { driverType: 'householdMember', driverUuid },
            personIndexByUuid: { [otherUuid]: 1, [driverUuid]: 2 },
            expected: 'interviewStats.labels.segment.driverType: 2',
            title: driverUuid,
            shown: '2'
        },
        {
            description: 'unknown household member stays unknown',
            segment: { driverType: 'householdMember', driverUuid },
            personIndexByUuid: { [otherUuid]: 1 },
            expected: 'interviewStats.labels.segment.driverType: ?',
            title: driverUuid,
            shown: '?'
        },
        {
            description: 'another driver type keeps its value',
            segment: { driverType: 'colleague' },
            personIndexByUuid: { [driverUuid]: 1 },
            expected: 'interviewStats.labels.segment.driverType: colleague',
            title: undefined,
            shown: undefined
        },
        {
            description: 'missing driver type stays unknown',
            segment: {},
            personIndexByUuid: {},
            expected: 'interviewStats.labels.segment.driverType: ?',
            title: undefined,
            shown: undefined
        }
    ])('$description', ({ segment, personIndexByUuid, expected, title, shown }) => {
        renderPassenger(segment, personIndexByUuid as { [personUuid: string]: number });

        expect(document.body.textContent).toContain(`(${expected})`);
        if (title === undefined || shown === undefined) {
            expect(screen.queryByTitle(driverUuid)).toBeNull();
        } else {
            expect(screen.getByTitle(title)).toHaveTextContent(shown);
        }
    });
});

describe('PersonPanel visited place times', () => {
    test('displays duration when visited place starts at midnight (0)', () => {
        const journeyWithMidnightPlace = {
            ...journey,
            visitedPlaces: [{ _uuid: 'place-midnight', startTime: 0, endTime: 3600 }]
        } as unknown as Journey;

        const { getByText } = render(
            <PersonPanel
                person={person}
                journey={journeyWithMidnightPlace}
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );

        expect(getByText(/\(1h\)/)).toBeTruthy();
    });
});

describe('PersonPanel trip bird distance and speed', () => {
    const pointAt = (latitude: number): GeoJSON.Feature<GeoJSON.Point> => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [-73.6, latitude] }
    });
    const originGeography = pointAt(45.5);
    const destinationGeography = pointAt(45.51);

    test.each([
        {
            description: 'both geographies and a duration',
            startPlace: { endTime: 3600, geography: originGeography },
            endPlace: { startTime: 4200, geography: destinationGeography },
            expectedText: '1. 1:001:10 (10 min) • 1112 m • 6.7 km/h',
            expectedHoverTexts: [
                ['1112 m', 'interviewStats.labels.trip.birdDistance'],
                ['6.7 km/h', 'interviewStats.labels.trip.birdSpeed']
            ]
        },
        {
            description: 'a distance in a duration of 0 has an infinite speed',
            startPlace: { endTime: 3600, geography: originGeography },
            endPlace: { startTime: 3600, geography: destinationGeography },
            expectedText: '1. 1:001:00 (0 min) • 1112 m • ∞ km/h',
            expectedHoverTexts: [
                ['1112 m', 'interviewStats.labels.trip.birdDistance'],
                ['∞ km/h', 'interviewStats.labels.trip.birdSpeed']
            ]
        },
        {
            description: 'no distance in a duration of 0 has no speed',
            startPlace: { endTime: 3600, geography: originGeography },
            endPlace: { startTime: 3600, geography: originGeography },
            expectedText: '1. 1:001:00 (0 min) • 0 m',
            expectedHoverTexts: [['0 m', 'interviewStats.labels.trip.birdDistance']]
        },
        {
            description: 'no distance in a duration has a speed of 0',
            startPlace: { endTime: 3600, geography: originGeography },
            endPlace: { startTime: 4200, geography: originGeography },
            expectedText: '1. 1:001:10 (10 min) • 0 m • 0 km/h',
            expectedHoverTexts: [
                ['0 m', 'interviewStats.labels.trip.birdDistance'],
                ['0 km/h', 'interviewStats.labels.trip.birdSpeed']
            ]
        },
        {
            description: 'no arrival time has no speed',
            startPlace: { endTime: 3600, geography: originGeography },
            endPlace: { geography: destinationGeography },
            expectedText: '1. 1:00? • 1112 m',
            expectedHoverTexts: [['1112 m', 'interviewStats.labels.trip.birdDistance']]
        },
        {
            description: 'a missing geography has no distance nor speed',
            startPlace: { endTime: 3600, geography: originGeography },
            endPlace: { startTime: 4200 },
            expectedText: '1. 1:001:10 (10 min)',
            expectedHoverTexts: []
        }
    ])('$description', ({ startPlace, endPlace, expectedText, expectedHoverTexts }) => {
        const journeyWithGeographies = {
            ...journey,
            trips: [createTrip({ startPlace, endPlace, segments: [] })]
        } as unknown as Journey;

        render(
            <PersonPanel
                person={person}
                journey={journeyWithGeographies}
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );

        // The SurveyObjectBox mock renders only its children, so the trip line is rendered from the props it received.
        const tripBoxProps = mockSurveyObjectBox.mock.calls.find(([props]) => props.objectType === 'trip')![0];
        const tripLine = 'selectableContent' in tripBoxProps ? tripBoxProps.selectableContent : undefined;
        const { container } = render(<>{tripLine}</>);
        expect(container.textContent).toEqual(expectedText);
        const hoverTextByValue = Array.from(container.querySelectorAll('span[title]')).map((element) => [
            element.textContent,
            element.getAttribute('title')
        ]);
        expect(hoverTextByValue).toEqual(expectedHoverTexts);
    });
});

describe('PersonPanel visited place lastAction', () => {
    test.each(['shortcut', 'findPlace'])('from geography (%s)', (lastAction) => {
        const visitedPlace = {
            _uuid: 'place-1',
            geography: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [0, 0] },
                properties: { lastAction }
            }
        };

        render(
            <PersonPanel
                person={person}
                journey={
                    {
                        ...journey,
                        visitedPlaces: [visitedPlace]
                    } as unknown as Journey
                }
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );

        expect(screen.getByText(/interviewStats.labels.lastAction/)).toBeInTheDocument();
        expect(screen.getByText(lastAction)).toBeInTheDocument();
    });

    test('does not show lastAction when it is missing', () => {
        render(
            <PersonPanel
                person={person}
                journey={
                    {
                        ...journey,
                        visitedPlaces: [{ _uuid: 'place-1' }]
                    } as unknown as Journey
                }
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );

        expect(screen.queryByText(/interviewStats.labels.lastAction/)).not.toBeInTheDocument();
    });
});

const placeUuid = 'place-1';

const auditFor = (objectType: string, objectUuid: string, errorCode: string): AuditForObject => ({
    version: 1,
    objectType,
    objectUuid,
    errorCode,
    level: 'error'
});

describe('PersonPanel journey box', () => {
    const journeyWithoutContent = { _uuid: journeyUuid, visitedPlaces: [], trips: [] } as unknown as Journey;

    test.each([
        {
            title: 'a journey with trips',
            expectedRendered: true,
            journeyToRender: journey
        },
        {
            title: 'a journey with visited places only',
            expectedRendered: true,
            journeyToRender: {
                _uuid: journeyUuid,
                visitedPlaces: [{ _uuid: placeUuid }],
                trips: []
            } as unknown as Journey
        },
        {
            title: 'a journey without visited places nor trips',
            expectedRendered: false,
            journeyToRender: journeyWithoutContent
        },
        {
            title: 'a journey whose trips have no start or end place',
            expectedRendered: false,
            journeyToRender: {
                _uuid: journeyUuid,
                visitedPlaces: [],
                trips: [{ _uuid: tripUuid }]
            } as unknown as Journey
        },
        {
            title: 'no journey',
            expectedRendered: false,
            journeyToRender: undefined
        },
        {
            title: 'a journey without places or trips but with an audit',
            expectedRendered: true,
            journeyToRender: journeyWithoutContent,
            auditsByObject: {
                journeys: { [journeyUuid]: [auditFor('journey', journeyUuid, 'J_L_JourneyNotClosed')] }
            }
        }
    ])('$title: journey box rendered is $expectedRendered', ({ expectedRendered, journeyToRender, auditsByObject }) => {
        render(
            <PersonPanel
                person={person}
                journey={journeyToRender}
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
                auditsByObject={auditsByObject}
            />
        );

        const journeyBoxRendered = mockSurveyObjectBox.mock.calls.some(
            ([props]) => props.objectType === 'journey' && props.objectUuid === journeyUuid
        );
        expect(journeyBoxRendered).toBe(expectedRendered);
    });
});

describe('PersonPanel object audits', () => {
    const journeyWithPlace = {
        _uuid: journeyUuid,
        visitedPlaces: [{ _uuid: placeUuid, startTime: 0, endTime: 3600 }],
        trips: journey.trips
    } as unknown as Journey;

    test.each([
        {
            title: 'person',
            errorCode: 'P_W_VeryOldAge',
            audits: [auditFor('person', personUuid, 'P_W_VeryOldAge')],
            auditsByObject: { persons: { [personUuid]: [auditFor('person', personUuid, 'P_W_VeryOldAge')] } }
        },
        {
            title: 'journey',
            errorCode: 'J_L_JourneyNotClosed',
            auditsByObject: { journeys: { [journeyUuid]: [auditFor('journey', journeyUuid, 'J_L_JourneyNotClosed')] } }
        },
        {
            title: 'visited place',
            errorCode: 'VP_M_Geography',
            auditsByObject: { visitedPlaces: { [placeUuid]: [auditFor('visitedPlace', placeUuid, 'VP_M_Geography')] } }
        },
        {
            title: 'trip',
            errorCode: 'T_L_TripSegmentsNotClosed',
            auditsByObject: { trips: { [tripUuid]: [auditFor('trip', tripUuid, 'T_L_TripSegmentsNotClosed')] } }
        },
        {
            title: 'segment',
            errorCode: 'S_M_Mode',
            auditsByObject: { segments: { [segmentUuid]: [auditFor('segment', segmentUuid, 'S_M_Mode')] } }
        }
    ])('shows the $title audit on that object', ({ errorCode, audits, auditsByObject }) => {
        render(
            <PersonPanel
                person={person}
                journey={journeyWithPlace}
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
                audits={audits}
                auditsByObject={auditsByObject}
            />
        );

        expect(screen.getByText(errorCode)).toBeInTheDocument();
    });
});

describe('PersonPanel review decision inheritance', () => {
    test('ancestor approval propagates through the journey subtree', () => {
        renderPersonPanel('approved');

        expect(getInheritedStatus('trip', tripUuid)).toBe('approved');
        expect(getInheritedStatus('segment', segmentUuid)).toBe('approved');
    });

    test('a rejected trip stays rejected inside an approved ancestor', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) =>
            objectType === 'trip' && objectUuid === tripUuid ? rejectedStatus('trip', tripUuid) : undefined
        );

        renderPersonPanel('approved');

        expect(getInheritedStatus('trip', tripUuid)).toBe('approved');
        expect(getInheritedStatus('segment', segmentUuid)).toBe('rejected');
    });
});

describe('PersonPanel rejection inheritance', () => {
    test('journey rejection propagates to trip and segment boxes', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) => {
            if (objectType === 'journey' && objectUuid === journeyUuid) {
                return rejectedStatus('journey', journeyUuid);
            }
            return undefined;
        });

        renderPersonPanel();

        expect(getInheritedStatus('trip', tripUuid)).toBe('rejected');
        expect(getInheritedStatus('segment', segmentUuid)).toBe('rejected');
    });

    test('trip rejection propagates to segment but not the trip box itself', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) => {
            if (objectType === 'trip' && objectUuid === tripUuid) {
                return rejectedStatus('trip', tripUuid);
            }
            return undefined;
        });

        renderPersonPanel();

        expect(getInheritedStatus('trip', tripUuid)).toBeUndefined();
        expect(getInheritedStatus('segment', segmentUuid)).toBe('rejected');
    });

    test('person rejection propagates to journey subtree descendants', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) => {
            if (objectType === 'person' && objectUuid === personUuid) {
                return rejectedStatus('person', personUuid);
            }
            return undefined;
        });

        renderPersonPanel();

        expect(getInheritedStatus('trip', tripUuid)).toBe('rejected');
        expect(getInheritedStatus('segment', segmentUuid)).toBe('rejected');
    });

    test('ancestor rejection propagates through the trip subtree', () => {
        renderPersonPanel('rejected');

        expect(getInheritedStatus('trip', tripUuid)).toBe('rejected');
        expect(getInheritedStatus('segment', segmentUuid)).toBe('rejected');
    });
});
