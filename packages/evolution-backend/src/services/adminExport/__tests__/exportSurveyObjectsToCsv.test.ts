/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ObjectReadableMock } from 'stream-mock';
import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import interviewsDbQueries from '../../../models/interviews.db.queries';
import reviewDecisionsDbQueries from '../../../models/reviewDecisions.db.queries';
import { exportSurveyObjectsToCsvTask } from '../exportSurveyObjectsToCsv';

jest.mock('../../../models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn()
}));
jest.mock('../../../models/reviewDecisions.db.queries', () => ({
    getReviewDecisionsForInterview: jest.fn().mockResolvedValue([])
}));
const mockGetReviewDecisionsForInterview = reviewDecisionsDbQueries.getReviewDecisionsForInterview as jest.MockedFunction<
    typeof reviewDecisionsDbQueries.getReviewDecisionsForInterview
>;
const mockGetInterviewsStream = interviewsDbQueries.getInterviewsStream as jest.MockedFunction<
    typeof interviewsDbQueries.getInterviewsStream
>;

// The survey objects of an interview are identified by its uuid
const mockCreateAllObjectsWithErrors = jest.fn().mockImplementation(async (interview) => ({
    interview: { uuid: interview.uuid }
}));
jest.mock('../../surveyObjects/SurveyObjectsFactory', () => ({
    SurveyObjectsFactory: jest.fn().mockImplementation(() => ({
        createAllObjectsWithErrors: mockCreateAllObjectsWithErrors
    }))
}));

jest.mock('evolution-common/lib/services/baseObjects/walkSurveyObjects', () => ({
    walkSurveyObjects: jest.fn()
}));
const mockWalkSurveyObjects = walkSurveyObjects as jest.MockedFunction<typeof walkSurveyObjects>;

const mockFinish = jest.fn().mockResolvedValue(['surveyObjects_test_person.csv']);
jest.mock('../CsvExportVisitor', () => ({
    CsvExportVisitor: jest.fn().mockImplementation(() => ({ finish: mockFinish }))
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('exportSurveyObjectsToCsvTask', () => {
    test.each([
        { description: 'no interview', interviews: [], expectedUuids: [], expectedIds: [] },
        {
            description: 'interviews without corrected response are skipped',
            interviews: [
                { id: 1, uuid: 'withCorrected1', corrected_response: { household: {} } },
                { id: 2, uuid: 'withoutCorrected', corrected_response: null },
                { id: 3, uuid: 'withCorrected2', corrected_response: {} }
            ],
            expectedUuids: ['withCorrected1', 'withCorrected2'],
            expectedIds: [1, 3]
        }
    ])('$description', async ({ interviews, expectedUuids, expectedIds }) => {
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock(interviews) as any);

        const fileNames = await exportSurveyObjectsToCsvTask();

        expect(mockGetInterviewsStream).toHaveBeenCalledWith({
            filters: {},
            select: { includeAudits: false, responseType: 'corrected' }
        });
        expect(mockGetReviewDecisionsForInterview.mock.calls.map(([interviewId]) => interviewId)).toEqual(expectedIds);
        expect(mockCreateAllObjectsWithErrors.mock.calls.map(([interview]) => interview.uuid)).toEqual(expectedUuids);
        // Each interview is walked twice: to find the rejected descendants, then to write the rows
        expect(mockWalkSurveyObjects.mock.calls.map(([surveyObjects]) => surveyObjects.interview?.uuid)).toEqual(
            expectedUuids.flatMap((uuid) => [uuid, uuid])
        );
        expect(mockFinish).toHaveBeenCalledTimes(1);
        expect(fileNames).toEqual(['surveyObjects_test_person.csv']);
    });
});
