/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { v4 as uuidV4 } from 'uuid';
import InterviewStats, { type InterviewStatsProps } from '../InterviewStats';
import { HomePanel } from '../../widgets/HomePanel';
import { HouseholdPanel } from '../../widgets/HouseholdPanel';
import { PersonPanel } from '../../widgets/PersonPanel';
import { getReviewDecisionStatusForObject } from '../../../../services/admin/reviewDecisionStatusHelper';
import {
    createApprovedReviewDecisionStatus,
    createRejectedReviewDecisionStatus
} from '../../../../services/admin/__tests__/reviewDecisionStatusHelperTestUtils';

jest.mock('../../../../services/admin/reviewDecisionStatusHelper');

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

jest.mock('../../AuditDisplay', () => ({
    __esModule: true,
    default: () => null
}));

jest.mock('../../widgets/InterviewPanel', () => ({
    InterviewPanel: () => null
}));

jest.mock('../../widgets/HomePanel', () => ({
    HomePanel: jest.fn(() => <div data-testid="home-panel" />)
}));

jest.mock('../../widgets/HouseholdPanel', () => ({
    HouseholdPanel: jest.fn(() => <div data-testid="household-panel" />)
}));

jest.mock('../../widgets/PersonPanel', () => ({
    PersonPanel: jest.fn(() => <div data-testid="person-panel" />)
}));

jest.mock('../../../../services/admin/useObjectReview', () => ({
    useReviewDecisionStatusByObject: jest.fn(() => ({}))
}));

const mockHomePanel = HomePanel as jest.MockedFunction<typeof HomePanel>;
const mockHouseholdPanel = HouseholdPanel as jest.MockedFunction<typeof HouseholdPanel>;
const mockPersonPanel = PersonPanel as jest.MockedFunction<typeof PersonPanel>;
const mockGetReviewDecisionStatusForObject = getReviewDecisionStatusForObject as jest.MockedFunction<
    typeof getReviewDecisionStatusForObject
>;

const interviewUuid = uuidV4();
const householdUuid = uuidV4();
const homeUuid = uuidV4();
const personUuid = uuidV4();

const rejectedStatus = createRejectedReviewDecisionStatus;
const approvedStatus = createApprovedReviewDecisionStatus;

const baseProps = {
    interview: { uuid: interviewUuid, _uuid: interviewUuid },
    surveyObjectsAndAudits: {
        interview: { uuid: interviewUuid, _uuid: interviewUuid },
        household: {
            _uuid: householdUuid,
            members: [{ _uuid: personUuid, journeys: [] }]
        },
        home: { _uuid: homeUuid },
        audits: [],
        auditsByObject: { persons: {} }
    },
    user: { id: 1 },
    selectPlace: jest.fn(),
    selectTrip: jest.fn()
} as unknown as InterviewStatsProps;

beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewDecisionStatusForObject.mockReturnValue(undefined);
});

describe('InterviewStats rejection inheritance', () => {
    test('interview rejection propagates to home, household, and person panels', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) => {
            if (objectType === 'interview' && objectUuid === interviewUuid) {
                return rejectedStatus('interview', interviewUuid);
            }
            return undefined;
        });

        render(<InterviewStats {...baseProps} />);

        expect(mockHomePanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'rejected' }),
            undefined
        );
        expect(mockHouseholdPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'rejected' }),
            undefined
        );
        expect(mockPersonPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'rejected' }),
            undefined
        );
    });

    test('household rejection propagates to person panels but not home', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) => {
            if (objectType === 'household' && objectUuid === householdUuid) {
                return rejectedStatus('household', householdUuid);
            }
            return undefined;
        });

        render(<InterviewStats {...baseProps} />);

        expect(mockHomePanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: undefined }),
            undefined
        );
        expect(mockHouseholdPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: undefined }),
            undefined
        );
        expect(mockPersonPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'rejected' }),
            undefined
        );
    });

    test('interview approval propagates to home, household, and person panels', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) =>
            objectType === 'interview' && objectUuid === interviewUuid
                ? approvedStatus('interview', interviewUuid)
                : undefined
        );

        render(<InterviewStats {...baseProps} />);

        expect(mockHomePanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'approved' }),
            undefined
        );
        expect(mockHouseholdPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'approved' }),
            undefined
        );
        expect(mockPersonPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'approved' }),
            undefined
        );
    });

    test('a rejected household keeps its persons rejected inside an approved interview', () => {
        mockGetReviewDecisionStatusForObject.mockImplementation((_map, objectType, objectUuid) => {
            if (objectType === 'interview' && objectUuid === interviewUuid) {
                return approvedStatus('interview', interviewUuid);
            }
            return objectType === 'household' && objectUuid === householdUuid
                ? rejectedStatus('household', householdUuid)
                : undefined;
        });

        render(<InterviewStats {...baseProps} />);

        expect(mockPersonPanel).toHaveBeenCalledWith(
            expect.objectContaining({ inheritedStatus: 'rejected' }),
            undefined
        );
    });
});

describe('InterviewStats when a survey object failed to create', () => {
    const householdCreationAudit = {
        version: 1,
        objectType: 'household',
        objectUuid: interviewUuid,
        errorCode: 'Household-validateParams-twoWheelNumber-should-be-a-positive-integer',
        message: 'Household validateParams: twoWheelNumber should be a positive integer',
        level: 'error' as const
    };

    test.each([
        {
            title: 'household',
            surveyObjectsAndAudits: {
                household: undefined,
                home: { _uuid: homeUuid },
                audits: [householdCreationAudit],
                auditsByObject: { household: [householdCreationAudit], persons: {} }
            }
        },
        {
            title: 'home',
            surveyObjectsAndAudits: {
                household: { _uuid: householdUuid, members: [] },
                home: undefined,
                audits: [],
                auditsByObject: { persons: {} }
            }
        }
    ])('still renders the interview panels when $title is missing', ({ surveyObjectsAndAudits }) => {
        render(
            <InterviewStats
                {...({
                    ...baseProps,
                    surveyObjectsAndAudits: {
                        ...baseProps.surveyObjectsAndAudits,
                        ...surveyObjectsAndAudits
                    }
                } as InterviewStatsProps)}
            />
        );

        expect(screen.queryByText('interviewStats.errors.householdNotAvailable')).not.toBeInTheDocument();
        expect(screen.queryByText('interviewStats.errors.homeNotAvailable')).not.toBeInTheDocument();
        expect(mockHomePanel).toHaveBeenCalled();
        expect(mockHouseholdPanel).toHaveBeenCalled();
    });

    test('passes household creation audits to HouseholdPanel', () => {
        render(
            <InterviewStats
                {...({
                    ...baseProps,
                    surveyObjectsAndAudits: {
                        ...baseProps.surveyObjectsAndAudits,
                        household: undefined,
                        audits: [householdCreationAudit],
                        auditsByObject: { household: [householdCreationAudit], persons: {} }
                    }
                } as InterviewStatsProps)}
            />
        );

        expect(mockHouseholdPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                household: undefined,
                audits: [householdCreationAudit]
            }),
            undefined
        );
        expect(screen.getByText('AllAudits')).toBeInTheDocument();
    });
});
