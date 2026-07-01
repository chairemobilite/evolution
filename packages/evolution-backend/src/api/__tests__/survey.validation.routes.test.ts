/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import request from 'supertest';
import express from 'express';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import validationSurveyRouter from '../survey.validation.routes';
import Interviews from '../../services/interviews/interviews';
import { copyResponseToCorrectedResponse } from '../../services/interviews/interview';
import { isUserAllowed } from '../../services/auth/userAuthorization';
import { surveyObjectExistsInInterview } from '../../services/surveyObjects/surveyObjectExistsInInterview';
import { ReviewDecisionService } from '../../services/reviews/ReviewDecisionService';
import { SurveyObjectsAndAuditsFactory } from '../../services/audits/SurveyObjectsAndAuditsFactory';
import { CANNOT_FORCE_APPROVE_WITHOUT_CONFLICT_ERROR_CODE } from '../../services/reviews/reviewDecisionErrors';

jest.mock('../../services/auth/userAuthorization', () => ({
    __esModule: true,
    default: jest.fn(() => (_req, _res, next) => next()),
    isUserAllowed: jest.fn(() => true)
}));

jest.mock('../../services/interviews/interviews', () => ({
    __esModule: true,
    default: {
        getInterviewByUuid: jest.fn()
    }
}));

jest.mock('../../services/interviews/interview', () => ({
    copyResponseToCorrectedResponse: jest.fn()
}));

jest.mock('../../services/surveyObjects/surveyObjectExistsInInterview', () => ({
    surveyObjectExistsInInterview: jest.fn(() => true)
}));

jest.mock('../../services/reviews/ReviewDecisionService', () => ({
    ReviewDecisionService: {
        setForceApproveAndGetReviewDecisions: jest.fn(),
        setReviewDecisionAndGetReviewDecisions: jest.fn(),
        requestReReviewAndGetReviewDecisions: jest.fn()
    }
}));

jest.mock('../../services/audits/SurveyObjectsAndAuditsFactory', () => ({
    SurveyObjectsAndAuditsFactory: {
        createSurveyObjectsAndAudits: jest.fn()
    }
}));

// survey.validation.routes reads reviewableSurveyObjects from evolution-common project.config
// (survey config.js), not backend config/projectConfig (server-only overlay without that field).
jest.mock('evolution-common/lib/config/project.config', () => ({
    __esModule: true,
    default: {
        reviewableSurveyObjects: ['person', 'trip', 'interview', 'household', 'home']
    }
}));

const mockGetInterviewByUuid = Interviews.getInterviewByUuid as jest.MockedFunction<
    typeof Interviews.getInterviewByUuid
>;
const mockCopyResponseToCorrectedResponse = copyResponseToCorrectedResponse as jest.MockedFunction<
    typeof copyResponseToCorrectedResponse
>;
const mockIsUserAllowed = isUserAllowed as jest.MockedFunction<typeof isUserAllowed>;
const mockSurveyObjectExistsInInterview = surveyObjectExistsInInterview as jest.MockedFunction<
    typeof surveyObjectExistsInInterview
>;
const mockSetForceApproveAndGetReviewDecisions =
    ReviewDecisionService.setForceApproveAndGetReviewDecisions as jest.MockedFunction<
        typeof ReviewDecisionService.setForceApproveAndGetReviewDecisions
    >;
const mockSetReviewDecisionAndGetReviewDecisions =
    ReviewDecisionService.setReviewDecisionAndGetReviewDecisions as jest.MockedFunction<
        typeof ReviewDecisionService.setReviewDecisionAndGetReviewDecisions
    >;
const mockRequestReReviewAndGetReviewDecisions =
    ReviewDecisionService.requestReReviewAndGetReviewDecisions as jest.MockedFunction<
        typeof ReviewDecisionService.requestReReviewAndGetReviewDecisions
    >;
const mockCreateSurveyObjectsAndAudits = SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudits as jest.MockedFunction<
    typeof SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudits
>;

let mockAuthUser: { id: number } | undefined = { id: 3 };

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.user = mockAuthUser;
    next();
});
app.use(validationSurveyRouter);

const reviewDecisionsPayload = {
    reviewDecisions: [],
    reviewDecisionsByObject: {
        interview: [],
        household: [],
        home: [],
        persons: {},
        journeys: {},
        visitedPlaces: {},
        trips: {},
        segments: {},
        organizations: {},
        vehicles: {},
        tripChains: {},
        junctions: {},
        workPlaces: {},
        schoolPlaces: {}
    },
    reviewDecisionStatusByObject: {
        persons: {},
        journeys: {},
        visitedPlaces: {},
        trips: {},
        segments: {},
        organizations: {},
        vehicles: {},
        tripChains: {},
        junctions: {},
        workPlaces: {},
        schoolPlaces: {}
    }
};

type ValidationReviewRouteCase = {
    path: 'reviewDecision' | 'requestReReview' | 'forceApprove';
    body: Record<string, unknown>;
    forbiddenError: string;
};

const runValidationReviewContextFailureTests = ({
    path,
    body,
    forbiddenError
}: ValidationReviewRouteCase) => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();
    const requestBody = {
        ...body,
        objectType: body.objectType ?? 'person',
        objectUuid: body.objectUuid ?? personUuid
    };

    beforeEach(() => {
        mockAuthUser = { id: 3 };
        mockGetInterviewByUuid.mockResolvedValue({
            id: 10,
            uuid: interviewUuid,
            corrected_response: { household: { persons: { [personUuid]: {} } } }
        } as any);
        mockIsUserAllowed.mockReturnValue(true);
        mockSurveyObjectExistsInInterview.mockReturnValue(true);
    });

    it('returns 401 when unauthenticated', async () => {
        mockAuthUser = undefined;

        const response = await request(app)
            .post(`/validation/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ status: 'error', error: 'Unauthorized' });
    });

    it('returns 400 when object type is not reviewable', async () => {
        const response = await request(app)
            .post(`/validation/${path}/${interviewUuid}`)
            .send({ ...requestBody, objectType: 'segment' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            status: 'error',
            error: 'Object type is not reviewable for this survey'
        });
    });

    it('returns 400 when object uuid is invalid', async () => {
        const response = await request(app)
            .post(`/validation/${path}/${interviewUuid}`)
            .send({ ...requestBody, objectUuid: 'not-a-uuid' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'error', error: 'Invalid object uuid' });
    });

    it('returns 404 when interview does not exist', async () => {
        mockGetInterviewByUuid.mockResolvedValue(undefined);

        const response = await request(app)
            .post(`/validation/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'error', error: 'Interview does not exist' });
    });

    it('returns 403 when user lacks required permissions', async () => {
        mockIsUserAllowed.mockReturnValue(false);

        const response = await request(app)
            .post(`/validation/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ status: 'error', error: forbiddenError });
    });

    it('returns 404 when survey object does not exist in interview', async () => {
        mockSurveyObjectExistsInInterview.mockReturnValue(false);

        const response = await request(app)
            .post(`/validation/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'error', error: 'Survey object does not exist in interview' });
    });
};

describe('POST /validation/reviewDecision/:interviewUuid', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthUser = { id: 3 };
        mockGetInterviewByUuid.mockResolvedValue({
            id: 10,
            uuid: interviewUuid,
            corrected_response: { household: { persons: { [personUuid]: {} } } }
        } as any);
        mockCopyResponseToCorrectedResponse.mockResolvedValue(undefined);
        mockIsUserAllowed.mockReturnValue(true);
        mockSurveyObjectExistsInInterview.mockReturnValue(true);
        mockSetReviewDecisionAndGetReviewDecisions.mockResolvedValue(reviewDecisionsPayload);
        mockCreateSurveyObjectsAndAudits.mockResolvedValue({
            audits: [],
            interview: undefined,
            household: undefined,
            home: undefined
        } as any);
    });

    it('returns success payload after persisting a review decision', async () => {
        const response = await request(app)
            .post(`/validation/reviewDecision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'approve',
                comment: 'looks good'
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.surveyObjectsAndAuditsAndReviewDecisions.reviewDecisions).toEqual([]);
        expect(mockSetReviewDecisionAndGetReviewDecisions).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve',
            comment: 'looks good'
        });
        expect(mockCopyResponseToCorrectedResponse).not.toHaveBeenCalled();
    });

    it('copies response to corrected_response when blank before persisting a review decision', async () => {
        const interviewWithResponseOnly = {
            id: 10,
            uuid: interviewUuid,
            response: { household: { persons: { [personUuid]: {} } } },
            corrected_response: undefined
        };
        mockGetInterviewByUuid.mockResolvedValue(interviewWithResponseOnly as any);
        mockCopyResponseToCorrectedResponse.mockImplementation(async (interview) => {
            interview.corrected_response = interview.response;
        });

        const response = await request(app)
            .post(`/validation/reviewDecision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'approve'
            });

        expect(response.status).toBe(200);
        expect(mockCopyResponseToCorrectedResponse).toHaveBeenCalledWith(interviewWithResponseOnly);
        expect(mockSetReviewDecisionAndGetReviewDecisions).toHaveBeenCalled();
        expect(mockCreateSurveyObjectsAndAudits).toHaveBeenCalled();
    });

    it('returns 400 when comment has the wrong type', async () => {
        const response = await request(app)
            .post(`/validation/reviewDecision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'approve',
                comment: 42
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'error', error: 'Invalid comment' });
        expect(mockGetInterviewByUuid).not.toHaveBeenCalled();
        expect(mockSetReviewDecisionAndGetReviewDecisions).not.toHaveBeenCalled();
    });

    it('returns 400 when decision is not approve or reject', async () => {
        const response = await request(app)
            .post(`/validation/reviewDecision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'maybe'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'error', error: 'Invalid review decision' });
        expect(mockGetInterviewByUuid).not.toHaveBeenCalled();
        expect(mockSetReviewDecisionAndGetReviewDecisions).not.toHaveBeenCalled();
    });

    describe('resolveValidationReviewContext failures', () => {
        runValidationReviewContextFailureTests({
            path: 'reviewDecision',
            body: { decision: 'approve' },
            forbiddenError: 'Validate permission required to review objects'
        });
    });
});

describe('POST /validation/requestReReview/:interviewUuid', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthUser = { id: 3 };
        mockGetInterviewByUuid.mockResolvedValue({
            id: 10,
            uuid: interviewUuid,
            corrected_response: { household: { persons: { [personUuid]: {} } } }
        } as any);
        mockCopyResponseToCorrectedResponse.mockResolvedValue(undefined);
        mockIsUserAllowed.mockReturnValue(true);
        mockSurveyObjectExistsInInterview.mockReturnValue(true);
        mockRequestReReviewAndGetReviewDecisions.mockResolvedValue(reviewDecisionsPayload);
        mockCreateSurveyObjectsAndAudits.mockResolvedValue({
            audits: [],
            interview: undefined,
            household: undefined,
            home: undefined
        } as any);
    });

    it('returns success payload after requesting a re-review', async () => {
        const response = await request(app)
            .post(`/validation/requestReReview/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                comment: 'please verify again'
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.surveyObjectsAndAuditsAndReviewDecisions.reviewDecisions).toEqual([]);
        expect(mockRequestReReviewAndGetReviewDecisions).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            reReviewRequestComment: 'please verify again'
        });
    });

    describe('resolveValidationReviewContext failures', () => {
        runValidationReviewContextFailureTests({
            path: 'requestReReview',
            body: { comment: 'please verify again' },
            forbiddenError: 'Validate permission required to request a re-review'
        });
    });
});

describe('POST /validation/forceApprove/:interviewUuid', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthUser = { id: 3 };
        mockGetInterviewByUuid.mockResolvedValue({
            id: 10,
            uuid: interviewUuid,
            corrected_response: { household: { persons: { [personUuid]: {} } } }
        } as any);
        mockCopyResponseToCorrectedResponse.mockResolvedValue(undefined);
        mockIsUserAllowed.mockReturnValue(true);
        mockSurveyObjectExistsInInterview.mockReturnValue(true);
        mockCreateSurveyObjectsAndAudits.mockResolvedValue({
            audits: [],
            interview: undefined,
            household: undefined,
            home: undefined
        } as any);
    });

    it('returns success payload after force-approving with conflict', async () => {
        mockSetForceApproveAndGetReviewDecisions.mockResolvedValue(reviewDecisionsPayload);

        const response = await request(app)
            .post(`/validation/forceApprove/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                comment: 'admin override'
            });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.surveyObjectsAndAuditsAndReviewDecisions.reviewDecisions).toEqual([]);
        expect(mockSetForceApproveAndGetReviewDecisions).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            forceApproveComment: 'admin override'
        });
    });

    it('returns 409 when force-approve is requested without reviewer conflict', async () => {
        mockSetForceApproveAndGetReviewDecisions.mockRejectedValue(
            new TrError(
                `Cannot force-approve person/${personUuid} without reviewer conflict`,
                CANNOT_FORCE_APPROVE_WITHOUT_CONFLICT_ERROR_CODE,
                'CannotForceApproveWithoutConflict'
            )
        );

        const response = await request(app)
            .post(`/validation/forceApprove/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                comment: 'admin override'
            });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            status: 'error',
            error: `Cannot force-approve person/${personUuid} without reviewer conflict`,
            errorCode: CANNOT_FORCE_APPROVE_WITHOUT_CONFLICT_ERROR_CODE
        });
        expect(mockSetForceApproveAndGetReviewDecisions).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            forceApproveComment: 'admin override'
        });
    });

    describe('resolveValidationReviewContext failures', () => {
        runValidationReviewContextFailureTests({
            path: 'forceApprove',
            body: { comment: 'admin override' },
            forbiddenError: 'Confirm permission required to force approve'
        });
    });
});
