/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
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
    default: () => null
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
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

describe('PersonPanel journey box', () => {
    const journeyWithoutContent = { _uuid: journeyUuid, visitedPlaces: [], trips: [] } as unknown as Journey;

    test.each([
        ['a journey with trips', journey, true],
        [
            'a journey with visited places only',
            { _uuid: journeyUuid, visitedPlaces: [{ _uuid: 'place-1' }], trips: [] } as unknown as Journey,
            true
        ],
        ['a journey without visited places nor trips', journeyWithoutContent, false],
        [
            'a journey whose trips have no start or end place',
            { _uuid: journeyUuid, visitedPlaces: [], trips: [{ _uuid: tripUuid }] } as unknown as Journey,
            false
        ],
        ['no journey', undefined, false]
    ])('%s: journey box rendered is %s', (_title, journeyToRender, expectedRendered) => {
        render(
            <PersonPanel
                person={person}
                journey={journeyToRender}
                personId={personUuid}
                selectPlace={jest.fn()}
                selectTrip={jest.fn()}
            />
        );

        const journeyBoxRendered = mockSurveyObjectBox.mock.calls.some(
            ([props]) => props.objectType === 'journey' && props.objectUuid === journeyUuid
        );
        expect(journeyBoxRendered).toBe(expectedRendered);
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
