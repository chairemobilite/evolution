/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ObjectReadableMock } from 'stream-mock';
import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import interviewsDbQueries from '../../../../models/interviews.db.queries';
import reviewDecisionsDbQueries from '../../../../models/reviewDecisions.db.queries';
import { execJob } from '../../../../tasks/serverWorkerPool';
import {
    exportSurveyObjectsToCsv,
    exportSurveyObjectsToCsvTask,
    isSurveyObjectsExportRunning
} from '../exportSurveyObjectsToCsv';

jest.mock('../../../../models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn()
}));
const mockGetInterviewsStream = interviewsDbQueries.getInterviewsStream as jest.MockedFunction<
    typeof interviewsDbQueries.getInterviewsStream
>;

jest.mock('../../../../models/reviewDecisions.db.queries', () => ({
    getReviewDecisionsForInterview: jest.fn().mockResolvedValue([])
}));
const mockGetReviewDecisionsForInterview =
    reviewDecisionsDbQueries.getReviewDecisionsForInterview as jest.MockedFunction<
        typeof reviewDecisionsDbQueries.getReviewDecisionsForInterview
    >;

jest.mock('../../../../tasks/serverWorkerPool', () => ({ execJob: jest.fn() }));
const mockExecJob = execJob as jest.MockedFunction<typeof execJob>;

// The survey objects of an interview are identified by its uuid. Interviews
// with a uuid starting with `invalid` have creation errors.
const mockCreateAllObjectsWithErrors = jest.fn().mockImplementation(async (interview) => ({
    interview: { uuid: interview.uuid },
    errorsByObject: { interview: interview.uuid.startsWith('invalid') ? [new Error('invalid')] : [] }
}));
jest.mock('../../../surveyObjects/SurveyObjectsFactory', () => ({
    SurveyObjectsFactory: jest.fn().mockImplementation(() => ({
        createAllObjectsWithErrors: mockCreateAllObjectsWithErrors
    }))
}));

jest.mock('evolution-common/lib/services/baseObjects/walkSurveyObjects', () => ({
    walkSurveyObjects: jest.fn()
}));
const mockWalkSurveyObjects = walkSurveyObjects as jest.MockedFunction<typeof walkSurveyObjects>;

const mockFinish = jest.fn().mockResolvedValue(['surveyObjects_test_person.csv']);
const mockClose = jest.fn();
jest.mock('../SurveyObjectsCsvWriter', () => ({
    SurveyObjectsCsvWriter: jest.fn().mockImplementation(() => ({ finish: mockFinish, close: mockClose }))
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('exportSurveyObjectsToCsvTask', () => {
    test.each([
        { description: 'no interview', interviews: [], expectedCreatedUuids: [], expectedExportedUuids: [] },
        {
            description: 'interviews without corrected response are not exported',
            interviews: [
                { id: 1, uuid: 'withCorrected1', corrected_response: { household: {} } },
                { id: 2, uuid: 'withoutCorrected', corrected_response: null },
                { id: 3, uuid: 'withCorrected2', corrected_response: {} }
            ],
            expectedCreatedUuids: ['withCorrected1', 'withCorrected2'],
            expectedExportedUuids: ['withCorrected1', 'withCorrected2']
        },
        {
            description: 'interviews with survey objects that could not be created are not exported',
            interviews: [
                { id: 1, uuid: 'valid1', corrected_response: {} },
                { id: 2, uuid: 'invalid', corrected_response: {} },
                { id: 3, uuid: 'valid2', corrected_response: {} }
            ],
            expectedCreatedUuids: ['valid1', 'invalid', 'valid2'],
            expectedExportedUuids: ['valid1', 'valid2']
        }
    ])('$description', async ({ interviews, expectedCreatedUuids, expectedExportedUuids }) => {
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock(interviews) as any);

        const fileNames = await exportSurveyObjectsToCsvTask();

        expect(mockGetInterviewsStream).toHaveBeenCalledWith({
            filters: {},
            select: { includeAudits: false, responseType: 'corrected' }
        });
        expect(mockCreateAllObjectsWithErrors.mock.calls.map(([interview]) => interview.uuid)).toEqual(
            expectedCreatedUuids
        );
        // Each exported interview is walked twice: to compute the reviews, then to write the rows
        expect(mockWalkSurveyObjects.mock.calls.map(([surveyObjects]) => surveyObjects.interview?.uuid)).toEqual(
            expectedExportedUuids.flatMap((uuid) => [uuid, uuid])
        );
        // The review decisions are only read for the exported interviews
        expect(mockGetReviewDecisionsForInterview).toHaveBeenCalledTimes(expectedExportedUuids.length);
        expect(mockFinish).toHaveBeenCalledTimes(1);
        expect(mockClose).toHaveBeenCalledTimes(1);
        expect(fileNames).toEqual(['surveyObjects_test_person.csv']);
    });

    test('closes the writer when the export fails', async () => {
        mockGetInterviewsStream.mockReturnValueOnce(
            new ObjectReadableMock([{ id: 1, uuid: 'valid', corrected_response: {} }]) as any
        );
        mockWalkSurveyObjects.mockRejectedValueOnce(new Error('cannot write'));

        await expect(exportSurveyObjectsToCsvTask()).rejects.toThrow('cannot write');

        expect(mockFinish).not.toHaveBeenCalled();
        expect(mockClose).toHaveBeenCalledTimes(1);
    });
});

describe('exportSurveyObjectsToCsv', () => {
    test.each([
        { description: 'succeeds', settleJob: (resolve: () => void, _reject: (error: Error) => void) => resolve() },
        {
            description: 'fails',
            settleJob: (_resolve: () => void, reject: (error: Error) => void) => reject(new Error('job failed'))
        }
    ])('runs one export at a time, until the job $description', async ({ settleJob }) => {
        let resolveJob: () => void = jest.fn();
        let rejectJob: (error: Error) => void = jest.fn();
        mockExecJob.mockReturnValueOnce(
            new Promise<void>((resolve, reject) => {
                resolveJob = resolve;
                rejectJob = reject;
            }) as any
        );
        // The failure of the job is logged
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(isSurveyObjectsExportRunning()).toEqual(false);
        expect(exportSurveyObjectsToCsv()).toEqual('exportStarted');
        expect(mockExecJob).toHaveBeenCalledWith('exportSurveyObjectsToCsv', []);
        expect(isSurveyObjectsExportRunning()).toEqual(true);
        expect(exportSurveyObjectsToCsv()).toEqual('alreadyRunning');
        expect(mockExecJob).toHaveBeenCalledTimes(1);

        settleJob(resolveJob, rejectJob);
        // Let the handlers of the job promise run
        await new Promise((resolve) => setImmediate(resolve));

        expect(isSurveyObjectsExportRunning()).toEqual(false);
    });
});
