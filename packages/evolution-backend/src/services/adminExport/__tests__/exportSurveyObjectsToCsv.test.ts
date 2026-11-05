/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ObjectReadableMock } from 'stream-mock';
import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import interviewsDbQueries from '../../../models/interviews.db.queries';
import { exportSurveyObjectsToCsvTask } from '../exportSurveyObjectsToCsv';

jest.mock('../../../models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn()
}));
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
        { description: 'no interview', interviews: [], expectedUuids: [] },
        {
            description: 'interviews without corrected response are skipped',
            interviews: [
                { uuid: 'withCorrected1', corrected_response: { household: {} } },
                { uuid: 'withoutCorrected', corrected_response: null },
                { uuid: 'withCorrected2', corrected_response: {} }
            ],
            expectedUuids: ['withCorrected1', 'withCorrected2']
        }
    ])('$description', async ({ interviews, expectedUuids }) => {
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock(interviews) as any);

        const fileNames = await exportSurveyObjectsToCsvTask();

        expect(mockGetInterviewsStream).toHaveBeenCalledWith({
            filters: {},
            select: { includeAudits: false, responseType: 'corrected' }
        });
        expect(mockCreateAllObjectsWithErrors.mock.calls.map(([interview]) => interview.uuid)).toEqual(expectedUuids);
        expect(mockWalkSurveyObjects.mock.calls.map(([surveyObjects]) => surveyObjects.interview?.uuid)).toEqual(
            expectedUuids
        );
        expect(mockFinish).toHaveBeenCalledTimes(1);
        expect(fileNames).toEqual(['surveyObjects_test_person.csv']);
    });
});
