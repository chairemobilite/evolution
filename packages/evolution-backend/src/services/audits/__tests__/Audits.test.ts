/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _omit from 'lodash/omit';
import _cloneDeep from 'lodash/cloneDeep';
import auditsDbQueries from '../../../models/audits.db.queries';
import { Audits } from '../Audits';
import { setProjectConfig } from '../../../config/projectConfig';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';

jest.mock('../../../models/audits.db.queries', () => ({
    setAuditsForInterview: jest.fn(),
    updateAudit: jest.fn()
}));
const mockSetAudits = auditsDbQueries.setAuditsForInterview as jest.MockedFunction<typeof auditsDbQueries.setAuditsForInterview>;
mockSetAudits.mockImplementation(async (_interviewId, audits) => audits);
const mockUpdateAudit = auditsDbQueries.updateAudit as jest.MockedFunction<typeof auditsDbQueries.updateAudit>;

const interviewId = 3;

describe('updateAudits', () => {

    beforeEach(() => {
        mockUpdateAudit.mockClear();
    });

    test('update empty list of audits', async () => {
        await Audits.updateAudits(3, []);
        expect(mockUpdateAudit).not.toHaveBeenCalled();
    });

    test('update single audit', async () => {
        const audits = [{
            version: 3,
            objectType: 'person',
            objectUuid: 'arbitrary',
            errorCode: 'err-code'
        }];
        await Audits.updateAudits(interviewId, audits);
        expect(mockUpdateAudit).toHaveBeenCalledTimes(audits.length);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[0]);
    });

    test('update many audits', async () => {
        const audits = [{
            version: 3,
            objectType: 'person',
            objectUuid: 'arbitrary',
            errorCode: 'err-code'
        }, {
            version: 3,
            objectType: 'interview',
            objectUuid: 'arbitrary',
            errorCode: 'err-code'
        }, {
            version: 3,
            objectType: 'person',
            objectUuid: 'arbitrary2',
            errorCode: 'err-code'
        }];
        await Audits.updateAudits(interviewId, audits);
        expect(mockUpdateAudit).toHaveBeenCalledTimes(audits.length);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[0]);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[1]);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[2]);
    });
});

describe('runAndSaveInterviewAudits', () => {

    const interviewAttributes: InterviewAttributes<any, any, any, any> = {
        id: interviewId,
        uuid: 'arbitrary',
        logs: [],
        participant_id: 1,
        is_valid: true,
        responses: {
            fieldA: 'a',
            fieldB: 'b',
            someObject: {
                _uuid: 'arbitraryUuid',
                field1: 3
            }
        },
        validations: {},
        is_completed: false,
        validated_data: {
            fieldA: 'modifiedA',
            fieldB: 'modifiedB',
            someObject: {
                _uuid: 'arbitraryUuid',
                field1: 3,
                newField: 'added'
            }
        }
    };

    const mockInterviewAudits = jest.fn();

    beforeEach(() => {
        mockSetAudits.mockClear();
        mockInterviewAudits.mockClear();
        setProjectConfig({ auditInterview: mockInterviewAudits });
    });

    test('audit function not set in config', async () => {
        // Unset the interview audit function
        setProjectConfig({ auditInterview: undefined });

        const objectsAndAudits = await Audits.runAndSaveInterviewAudits(interviewAttributes);
        expect(objectsAndAudits.audits).toEqual([]);
        expect(mockInterviewAudits).not.toHaveBeenCalled();
    });

    test('validated_data not set in interview', async () => {
        const objectsAndAudits = await Audits.runAndSaveInterviewAudits(_omit(interviewAttributes, 'validated_data'));
        expect(objectsAndAudits.audits).toEqual([]);
        expect(mockInterviewAudits).not.toHaveBeenCalled();
    });

    test('Function returns empty audits', async () => {
        // Return empty audit array
        mockInterviewAudits.mockResolvedValueOnce({ audits: [] });

        const objectsAndAudits = await Audits.runAndSaveInterviewAudits(interviewAttributes);
        expect(objectsAndAudits.audits).toEqual([]);
        expect(mockInterviewAudits).toHaveBeenCalledTimes(1);
        expect(mockInterviewAudits).toHaveBeenCalledWith(interviewAttributes);
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, []);
    });

    test('Function returns some audits', async () => {
        // Return an array of audits
        const auditsFromInterview = {
            audits: [{
                version: 3,
                objectType: 'person',
                objectUuid: 'arbitrary',
                errorCode: 'err-code'
            }, {
                version: 3,
                objectType: 'interview',
                objectUuid: 'arbitrary',
                errorCode: 'err-code'
            }, {
                version: 3,
                objectType: 'person',
                objectUuid: 'arbitrary2',
                errorCode: 'err-code'
            }]
        };
        const originalAudits = _cloneDeep(auditsFromInterview.audits);
        mockInterviewAudits.mockResolvedValueOnce(auditsFromInterview);
        // Add an ignore status to all audits when saving
        mockSetAudits.mockImplementationOnce(async (_interviewId, audits) => audits.map((audit) => ({ ...audit, ignore: true })));

        const objectsAndAudits = await Audits.runAndSaveInterviewAudits(interviewAttributes);
        expect(mockInterviewAudits).toHaveBeenCalledTimes(1);
        expect(mockInterviewAudits).toHaveBeenCalledWith(interviewAttributes);
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, originalAudits);

        // Returned audits should be the updated ones from the database set
        expect(objectsAndAudits.audits).toEqual(objectsAndAudits.audits.map((audit) => ({ ...audit, ignore: true })));
    });
});

