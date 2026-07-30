/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    applyReviewBackendBuildIdToInterview,
    getBuildIdsValuesByPath,
    getParticipantBackendBuildIdsValuesByPath,
    getReviewBackendBuildIdsValuesByPath,
    PARTICIPANT_BACKEND_BUILD_IDS_PATH,
    persistReviewBackendBuildId,
    REVIEW_BACKEND_BUILD_IDS_PATH
} from '../backendBuildIds';
import interviewsDbQueries from '../../../models/interviews.db.queries';

jest.mock('../../../config/buildId', () => ({
    getBackendBuildId: jest.fn(() => 'backend-sha')
}));

jest.mock('../../../models/interviews.db.queries', () => ({
    __esModule: true,
    default: {
        update: jest.fn()
    }
}));
const mockDbUpdate = interviewsDbQueries.update as jest.MockedFunction<typeof interviewsDbQueries.update>;

describe.each([
    [
        'participant response',
        PARTICIPANT_BACKEND_BUILD_IDS_PATH,
        getParticipantBackendBuildIdsValuesByPath
    ],
    [
        'review corrected_response',
        REVIEW_BACKEND_BUILD_IDS_PATH,
        getReviewBackendBuildIdsValuesByPath
    ]
] as const)('getBuildIdsValuesByPath (%s)', (_label, path, getValuesByPath) => {
    it('should append build ids when the build id changed', () => {
        // Setup: no build id history yet (undefined). The running backend deployment
        // (mocked as 'backend-sha') has never been recorded on this field.
        expect(getValuesByPath(undefined)).toEqual({
            [path]: [expect.objectContaining({ buildId: 'backend-sha', startTimestamp: expect.any(Number) })]
        });
    });

    it('should return an empty patch when the build id did not change', () => {
        // Setup: the last recorded entry already matches the current backend deployment.
        // appendBuildIdIfChanged has nothing new to append, so the route should not
        // add this path to valuesByPath.
        expect(getValuesByPath([{ buildId: 'backend-sha', startTimestamp: 1632929461 }])).toEqual({});
    });
});

describe('getBuildIdsValuesByPath', () => {
    it('should work for any response field path', () => {
        expect(getBuildIdsValuesByPath('response._customBuildIds', undefined)).toEqual({
            'response._customBuildIds': [
                expect.objectContaining({ buildId: 'backend-sha', startTimestamp: expect.any(Number) })
            ]
        });
    });
});

describe('review backend build id persistence', () => {
    it('should append review backend build ids on corrected_response', () => {
        const interview = {
            uuid: 'interview-uuid',
            corrected_response: {}
        } as any;

        expect(applyReviewBackendBuildIdToInterview(interview)).toBe(true);
        expect(interview.corrected_response._reviewBackendBuildIds).toEqual([
            expect.objectContaining({ buildId: 'backend-sha', startTimestamp: expect.any(Number) })
        ]);
    });

    it('should not throw when persisting the build id fails', async () => {
        mockDbUpdate.mockRejectedValueOnce(new Error('db unavailable'));
        const interview = {
            uuid: 'interview-uuid',
            corrected_response: {}
        } as any;

        await expect(persistReviewBackendBuildId(interview)).resolves.toBeUndefined();
        expect(mockDbUpdate).toHaveBeenCalled();
    });
});
