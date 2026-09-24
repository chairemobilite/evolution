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

const person = { _uuid: personUuid } as Person;
const journey = {
    _uuid: journeyUuid,
    visitedPlaces: [],
    trips: [
        {
            _uuid: tripUuid,
            startPlace: { endTime: 100 },
            endPlace: { startTime: 200 },
            segments: [{ _uuid: segmentUuid, mode: 'walk' }]
        }
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
                {
                    _uuid: tripUuid,
                    startPlace: { endTime: 100 },
                    endPlace: { startTime: 200 },
                    segments: [{ _uuid: segmentUuid, mode, ...segment }]
                }
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
