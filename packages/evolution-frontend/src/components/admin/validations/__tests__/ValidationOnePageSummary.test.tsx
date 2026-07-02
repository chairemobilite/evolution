/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { v4 as uuidV4 } from 'uuid';
import ValidationOnePageSummary from '../ValidationOnePageSummary';
import appConfig from '../../../../config/application.config';
import { generateMapFeatureFromInterview } from '../../../../services/admin/odSurveyAdminHelper';

const interviewUuid = uuidV4();

const mockUseSelector = jest.fn();
const mockDispatch = jest.fn();

jest.mock('../../../../actions/SurveyAdmin', () => ({
    startUpdateSurveyCorrectedInterview: jest.fn(() => jest.fn())
}));

jest.mock('chaire-lib-frontend/lib/components/pages/LoadingPage', () => ({
    __esModule: true,
    default: () => <div>Loading...</div>
}));

jest.mock('evolution-common/lib/config/project.config', () => ({
    __esModule: true,
    default: {
        mapDefaultCenter: { lon: -73.5, lat: 45.5 }
    }
}));

jest.mock('react-redux', () => ({
    useSelector: (selector: (state: unknown) => unknown) => mockUseSelector(selector),
    useDispatch: () => mockDispatch
}));

jest.mock('chaire-lib-common/lib/config/Preferences', () => ({
    __esModule: true,
    default: {
        load: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(() => false),
        update: jest.fn().mockResolvedValue(undefined),
        addChangeListener: jest.fn(),
        removeChangeListener: jest.fn()
    }
}));

jest.mock('../../../../config/application.config', () => ({
    __esModule: true,
    default: {
        getCustomInterviewStat: jest.fn(() => null),
        getCustomInterviewMap: jest.fn(() => null),
        generateMapFeatures: jest.fn()
    }
}));

jest.mock('../../../../services/admin/odSurveyAdminHelper', () => ({
    generateMapFeatureFromInterview: jest.fn(() => ({
        placesCollection: { type: 'FeatureCollection', features: [] },
        tripsCollection: { type: 'FeatureCollection', features: [] },
        pathToUniqueKeyMap: new Map()
    }))
}));

jest.mock('../ValidationCommentForm', () => ({
    __esModule: true,
    default: () => null
}));

jest.mock('../../hoc/AdminErrorBoundary', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('../InterviewMap', () => ({
    __esModule: true,
    default: () => <div data-testid="interview-map" />
}));

jest.mock('../InterviewStats', () => ({
    __esModule: true,
    default: () => <div data-testid="interview-stats" />
}));

const mockGenerateMapFeatures = appConfig.generateMapFeatures as jest.Mock;

const mockGenerateMapFeatureFromInterview = generateMapFeatureFromInterview as jest.MockedFunction<
    typeof generateMapFeatureFromInterview
>;

const emptyMapFeatures = {
    placesCollection: { type: 'FeatureCollection' as const, features: [] },
    tripsCollection: { type: 'FeatureCollection' as const, features: [] },
    pathToUniqueKeyMap: new Map()
};

const setInterviewState = (interview: Record<string, unknown> | undefined) => {
    mockUseSelector.mockImplementation((selector: (state: unknown) => unknown) =>
        selector({
            survey: { interview },
            auth: { user: { id: 1 } }
        })
    );
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockGenerateMapFeatureFromInterview.mockReturnValue(emptyMapFeatures);
    setInterviewState({ uuid: interviewUuid, response: {} });
});

describe('ValidationOnePageSummary fallbacks', () => {
    test('shows the survey-objects timeout fallback after 30 seconds', async () => {
        jest.useFakeTimers();
        render(<ValidationOnePageSummary />);
        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        expect(await screen.findByText('interviewStats.errors.surveyObjectsLoadTimedOut')).toBeInTheDocument();
    });

    test('shows the survey-objects timeout fallback when interview uuid is missing', async () => {
        jest.useFakeTimers();
        setInterviewState({ response: {} });

        render(<ValidationOnePageSummary />);
        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        expect(await screen.findByText('interviewStats.errors.surveyObjectsLoadTimedOut')).toBeInTheDocument();
    });

    test('falls back to generateMapFeatureFromInterview when custom map generation fails', async () => {
        mockGenerateMapFeatures.mockImplementation(() => {
            throw new Error('custom map failed');
        });

        setInterviewState({
            uuid: interviewUuid,
            response: {},
            surveyObjectsAndAudits: {
                interview: { uuid: interviewUuid },
                household: { members: [] },
                home: {},
                audits: [],
                auditsByObject: {}
            }
        });

        render(<ValidationOnePageSummary />);

        expect(await screen.findByTestId('interview-map')).toBeInTheDocument();
        expect(mockGenerateMapFeatureFromInterview).toHaveBeenCalled();
    });

    test('uses generateMapFeatureFromInterview when surveyObjectsAndAudits is unavailable', async () => {
        mockGenerateMapFeatures.mockReturnValue(emptyMapFeatures);

        setInterviewState({
            uuid: interviewUuid,
            response: {},
            surveyObjectsAndAudits: undefined
        });

        render(<ValidationOnePageSummary />);

        await waitFor(() => {
            expect(mockGenerateMapFeatureFromInterview).toHaveBeenCalled();
        });
    });
});
