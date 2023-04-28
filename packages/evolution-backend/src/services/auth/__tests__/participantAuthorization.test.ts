/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidV4 } from 'uuid'
import isAuthorized from '../participantAuthorization';
import each from 'jest-each';
import Interviews from '../../interviews/interviews';

let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let nextFunction: NextFunction = jest.fn();
let mockParticipant = { id: 3, username: 'participant' };
let mockOtherParticipant = { id: 4, username: 'other' };

const mockGetInterviewByUuid = Interviews.getInterviewByUuid = jest.fn();

const interviewId = uuidV4();

beforeEach(() => {
    mockRequest = {};
    mockResponse = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
    };
    (nextFunction as any).mockClear();
    mockGetInterviewByUuid.mockClear();
});

describe('Participant interview access', () => {
    const defaultGetParams = { params: { interviewId }};
    const defaultPostParams = { body: { interviewId }};

    each([
        ['No participant', undefined, defaultGetParams, true, 401],
        ['Participant, no interview id', mockParticipant, {}, true, true],
        ['Get params, participant, interview not found', mockParticipant, defaultGetParams, false, 404],
        ['Get params, participant, own interview, ok', mockParticipant, defaultGetParams, true, true],
        ['Get params, participant, own interview inactive, not ok', mockParticipant, defaultGetParams, true, 401, false],
        ['Get params, participant, other participant, not ok', mockOtherParticipant, defaultGetParams, true, 401],
        ['Post params, participant, interview not found', mockParticipant, defaultPostParams, undefined, 404],
        ['Post params, participant, own interview, ok', mockParticipant, defaultPostParams, true, true],
        ['Post params, participant, own interview inactive, not ok', mockParticipant, defaultGetParams, true, 401, false],
        ['Post params, participant, other interview, not ok', mockOtherParticipant, defaultPostParams, true, 401, false],
        ['Post and get params, identical, ok', mockParticipant, { ...defaultPostParams, ...defaultGetParams }, true, true],
        ['Post and get params, not identical, ok', mockParticipant, { ...defaultGetParams, body: { interviewId: uuidV4() } }, true, 400]
    ]).test('%s', async (_title, participant, reqParams, isDefined, expectedNextOrCode, is_active = true) => {
        mockRequest.user = participant;
        const request = {...mockRequest, ...reqParams };
        mockGetInterviewByUuid.mockResolvedValue(isDefined ? { id: 1, participant_id: mockParticipant.id, is_active } : undefined);
        await isAuthorized()(request as Request, mockResponse as Response, nextFunction);
        if (typeof expectedNextOrCode === 'number') {
            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(expectedNextOrCode);
            expect(nextFunction).not.toHaveBeenCalled();
        } else {
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalledTimes(1);
        }
    });
});
