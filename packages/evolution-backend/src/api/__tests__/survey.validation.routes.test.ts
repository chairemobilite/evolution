/*
 * Copyright Polytechnique Montreal and contributors
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

// Mirrors the real interviewUserIsAuthorized behavior (services/auth/userAuthorization.ts),
// using the mocked Interviews and the shared isUserAllowed mock so tests can drive
// authorization failures.
jest.mock('../../services/auth/userAuthorization', () => {
    const isUserAllowed = jest.fn((_user: unknown, _interview: unknown, _permissions: string[]) => true);
    const interviewUserIsAuthorized = jest.fn(
        (permissions: string[]) => async (req: any, res: any, next: any) => {
            if (!req.user?.id) {
                return res.status(401).json({ status: 'Unauthorized' });
            }
            const interviewId = req.params?.interviewId || req.body?.interviewId;
            if (!interviewId) {
                return next();
            }
            const interview = await require('../../services/interviews/interviews').default.getInterviewByUuid(
                interviewId
            );
            if (!interview) {
                return res.status(404).json({ status: 'NotFound' });
            }
            if (!isUserAllowed(req.user, interview, permissions)) {
                return res.status(401).json({ status: 'Unauthorized' });
            }
            next();
        }
    );
    return { __esModule: true, default: interviewUserIsAuthorized, isUserAllowed };
});

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
        getReviewDecisions: jest.fn(),
        setForceApprove: jest.fn(),
        setReviewDecision: jest.fn(),
        clearReviewDecision: jest.fn(),
        clearForceApprove: jest.fn(),
        requestReReview: jest.fn()
    }
}));

jest.mock('../../services/audits/SurveyObjectsAndAuditsFactory', () => ({
    SurveyObjectsAndAuditsFactory: {
        createSurveyObjectsAndSaveAuditsToDb: jest.fn()
    }
}));

jest.mock('../../services/paradata/backendBuildIds', () => ({
    persistReviewBackendBuildId: jest.fn().mockResolvedValue(undefined),
    getReviewBackendBuildIdsValuesByPath: jest.fn(() => ({}))
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
const mockGetReviewDecisions = ReviewDecisionService.getReviewDecisions as jest.MockedFunction<
    typeof ReviewDecisionService.getReviewDecisions
>;
const mockSetForceApprove =
    ReviewDecisionService.setForceApprove as jest.MockedFunction<
        typeof ReviewDecisionService.setForceApprove
    >;
const mockSetReviewDecision =
    ReviewDecisionService.setReviewDecision as jest.MockedFunction<
        typeof ReviewDecisionService.setReviewDecision
    >;
const mockClearReviewDecision =
    ReviewDecisionService.clearReviewDecision as jest.MockedFunction<
        typeof ReviewDecisionService.clearReviewDecision
    >;
const mockClearForceApprove =
    ReviewDecisionService.clearForceApprove as jest.MockedFunction<
        typeof ReviewDecisionService.clearForceApprove
    >;
const mockRequestReReview =
    ReviewDecisionService.requestReReview as jest.MockedFunction<
        typeof ReviewDecisionService.requestReReview
    >;
const mockCreateSurveyObjectsAndSaveAuditsToDb = SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb as jest.MockedFunction<
    typeof SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb
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
    path: 'decision' | 'clearDecision' | 'reReview' | 'forceApprove' | 'clearForceApprove';
    body: Record<string, unknown>;
};

const runValidationReviewContextFailureTests = ({ path, body }: ValidationReviewRouteCase) => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();
    const requestBody = {
        ...body,
        objectType: body.objectType ?? 'person',
        objectUuid: body.objectUuid ?? personUuid
    };

    beforeEach(() => {
        jest.clearAllMocks();
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
            .post(`/review/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ status: 'Unauthorized' });
    });

    it('returns 400 when object type is not reviewable', async () => {
        const response = await request(app)
            .post(`/review/${path}/${interviewUuid}`)
            .send({ ...requestBody, objectType: 'segment' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            status: 'error',
            error: 'Object type is not reviewable for this survey'
        });
    });

    it('returns 400 when object uuid is invalid', async () => {
        const response = await request(app)
            .post(`/review/${path}/${interviewUuid}`)
            .send({ ...requestBody, objectUuid: 'not-a-uuid' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'error', error: 'Invalid object uuid' });
    });

    // With the interviewId route param, interviewUserIsAuthorized fetches the interview
    // and returns the 404 before the review middleware runs.
    it('returns 404 when interview does not exist', async () => {
        mockGetInterviewByUuid.mockResolvedValue(undefined);

        const response = await request(app)
            .post(`/review/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'NotFound' });
    });

    it('returns 401 when the user lacks the required permissions', async () => {
        mockIsUserAllowed.mockReturnValue(false);

        const response = await request(app)
            .post(`/review/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ status: 'Unauthorized' });
    });

    it('returns 404 when survey object does not exist in interview', async () => {
        mockSurveyObjectExistsInInterview.mockReturnValue(false);

        const response = await request(app)
            .post(`/review/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'error', error: 'Survey object does not exist in interview' });
    });

    it('returns 409 when corrected_response is blank', async () => {
        mockGetInterviewByUuid.mockResolvedValue({
            id: 10,
            uuid: interviewUuid,
            response: { household: { persons: { [requestBody.objectUuid as string]: {} } } },
            corrected_response: undefined
        } as any);

        const response = await request(app)
            .post(`/review/${path}/${interviewUuid}`)
            .send(requestBody);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            status: 'error',
            error: 'Interview has not been opened for correction yet'
        });
        expect(mockCopyResponseToCorrectedResponse).not.toHaveBeenCalled();
    });
};

type SetupValidationReviewMutationMocksOptions = {
    interviewUuid: string;
    personUuid: string;
    configureMocks?: () => void;
};

/** Shared mock setup for POST validation review-mutation route success tests. */
const setupValidationReviewMutationMocks = ({
    interviewUuid,
    personUuid,
    configureMocks
}: SetupValidationReviewMutationMocksOptions) => {
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
        mockCreateSurveyObjectsAndSaveAuditsToDb.mockResolvedValue({
            audits: [],
            interview: undefined,
            household: undefined,
            home: undefined
        } as any);
        configureMocks?.();
    });
};

describe('GET /review/decisions/:interviewId', () => {
    const interviewUuid = uuidV4();

    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthUser = { id: 3 };
        mockIsUserAllowed.mockReturnValue(true);
        mockGetInterviewByUuid.mockResolvedValue({ id: 10, uuid: interviewUuid } as any);
        mockGetReviewDecisions.mockResolvedValue(reviewDecisionsPayload);
    });

    it('returns the review decisions for the interview', async () => {
        const response = await request(app).get(`/review/decisions/${interviewUuid}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', reviewDecisions: reviewDecisionsPayload });
        expect(mockGetReviewDecisions).toHaveBeenCalledWith(10, 3);
        expect(mockCreateSurveyObjectsAndSaveAuditsToDb).not.toHaveBeenCalled();
    });

    it('returns 401 when unauthenticated', async () => {
        mockAuthUser = undefined;

        const response = await request(app).get(`/review/decisions/${interviewUuid}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ status: 'Unauthorized' });
        expect(mockGetReviewDecisions).not.toHaveBeenCalled();
    });

    // With the interviewId route param, interviewUserIsAuthorized fetches the interview
    // and returns the 404 before the route handler runs.
    it('returns 404 when interview does not exist', async () => {
        mockGetInterviewByUuid.mockResolvedValue(undefined);

        const response = await request(app).get(`/review/decisions/${interviewUuid}`);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ status: 'NotFound' });
        expect(mockGetReviewDecisions).not.toHaveBeenCalled();
    });

    it('returns 500 when fetching review decisions fails', async () => {
        mockGetReviewDecisions.mockRejectedValue(new Error('boom'));

        const response = await request(app).get(`/review/decisions/${interviewUuid}`);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ status: 'error' });
    });
});

describe('POST /review/decision/:interviewId', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    setupValidationReviewMutationMocks({
        interviewUuid,
        personUuid,
        configureMocks: () => {
            mockSetReviewDecision.mockResolvedValue(reviewDecisionsPayload);
        }
    });

    it('returns success payload after persisting a review decision', async () => {
        const response = await request(app)
            .post(`/review/decision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'approve',
                comment: 'looks good'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', reviewDecisions: reviewDecisionsPayload });
        expect(mockSetReviewDecision).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve',
            comment: 'looks good'
        });
        expect(mockCopyResponseToCorrectedResponse).not.toHaveBeenCalled();
        // Review mutations must not recompute audits/objects (reviews are a separate layer)
        expect(mockCreateSurveyObjectsAndSaveAuditsToDb).not.toHaveBeenCalled();
    });

    it('returns 400 when comment has the wrong type', async () => {
        const response = await request(app)
            .post(`/review/decision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'approve',
                comment: 42
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'error', error: 'Invalid comment' });
        expect(mockSetReviewDecision).not.toHaveBeenCalled();
    });

    it('returns 400 when decision is not approve or reject', async () => {
        const response = await request(app)
            .post(`/review/decision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                decision: 'maybe'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ status: 'error', error: 'Invalid review decision' });
        expect(mockSetReviewDecision).not.toHaveBeenCalled();
    });

    describe('validateReviewObjectMiddleware failures', () => {
        runValidationReviewContextFailureTests({
            path: 'decision',
            body: { decision: 'approve' },
        });
    });
});

describe('POST /review/reReview/:interviewId', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    setupValidationReviewMutationMocks({
        interviewUuid,
        personUuid,
        configureMocks: () => {
            mockRequestReReview.mockResolvedValue(reviewDecisionsPayload);
        }
    });

    it('returns success payload after requesting a re-review', async () => {
        const response = await request(app)
            .post(`/review/reReview/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                comment: 'please verify again'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', reviewDecisions: reviewDecisionsPayload });
        expect(mockRequestReReview).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            reReviewRequestComment: 'please verify again'
        });
    });

    describe('validateReviewObjectMiddleware failures', () => {
        runValidationReviewContextFailureTests({
            path: 'reReview',
            body: { comment: 'please verify again' },
        });
    });
});

describe('POST /review/clearDecision/:interviewId', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    setupValidationReviewMutationMocks({
        interviewUuid,
        personUuid,
        configureMocks: () => {
            mockClearReviewDecision.mockResolvedValue(reviewDecisionsPayload);
        }
    });

    it('returns success payload after clearing a review decision', async () => {
        const response = await request(app)
            .post(`/review/clearDecision/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', reviewDecisions: reviewDecisionsPayload });
        expect(mockClearReviewDecision).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid
        });
    });

    describe('validateReviewObjectMiddleware failures', () => {
        runValidationReviewContextFailureTests({
            path: 'clearDecision',
            body: {},
        });
    });
});

describe('POST /review/clearForceApprove/:interviewId', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    setupValidationReviewMutationMocks({
        interviewUuid,
        personUuid,
        configureMocks: () => {
            mockClearForceApprove.mockResolvedValue(reviewDecisionsPayload);
        }
    });

    it('returns success payload after clearing force-approve', async () => {
        const response = await request(app)
            .post(`/review/clearForceApprove/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', reviewDecisions: reviewDecisionsPayload });
        expect(mockClearForceApprove).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid
        });
    });

    describe('validateReviewObjectMiddleware failures', () => {
        runValidationReviewContextFailureTests({
            path: 'clearForceApprove',
            body: {},
        });
    });
});

describe('POST /review/forceApprove/:interviewId', () => {
    const interviewUuid = uuidV4();
    const personUuid = uuidV4();

    setupValidationReviewMutationMocks({ interviewUuid, personUuid });

    it('returns success payload after force-approving with conflict', async () => {
        mockSetForceApprove.mockResolvedValue(reviewDecisionsPayload);

        const response = await request(app)
            .post(`/review/forceApprove/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                comment: 'admin override'
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'success', reviewDecisions: reviewDecisionsPayload });
        expect(mockSetForceApprove).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            forceApproveComment: 'admin override'
        });
    });

    it('returns 409 when force-approve is requested without reviewer conflict', async () => {
        mockSetForceApprove.mockRejectedValue(
            new TrError(
                `Cannot force-approve person/${personUuid} without reviewer conflict`,
                CANNOT_FORCE_APPROVE_WITHOUT_CONFLICT_ERROR_CODE,
                'CannotForceApproveWithoutConflict'
            )
        );

        const response = await request(app)
            .post(`/review/forceApprove/${interviewUuid}`)
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
        expect(mockSetForceApprove).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            forceApproveComment: 'admin override'
        });
    });

    it('returns 500 when force-approve fails with an unexpected error', async () => {
        mockSetForceApprove.mockRejectedValue(new Error('boom'));

        const response = await request(app)
            .post(`/review/forceApprove/${interviewUuid}`)
            .send({
                objectType: 'person',
                objectUuid: personUuid,
                comment: 'admin override'
            });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ status: 'error' });
        expect(mockSetForceApprove).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: personUuid,
            forceApproveComment: 'admin override'
        });
    });

    describe('validateReviewObjectMiddleware failures', () => {
        runValidationReviewContextFailureTests({
            path: 'forceApprove',
            body: { comment: 'admin override' },
        });
    });
});
