/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _omit from 'lodash/omit';
import auditsDbQueries from '../../../models/audits.db.queries';
import { SurveyObjectsAndAuditsFactory } from '../SurveyObjectsAndAuditsFactory';
import { AuditService } from '../AuditService';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { Household } from 'evolution-common/lib/services/baseObjects/Household';
import type { Home } from 'evolution-common/lib/services/baseObjects/Home';

jest.mock('../../../models/audits.db.queries', () => ({
    setAuditsForInterview: jest.fn(),
    updateAudit: jest.fn()
}));
jest.mock('../AuditService', () => ({
    AuditService: {
        auditInterview: jest.fn()
    }
}));

const mockSetAudits = auditsDbQueries.setAuditsForInterview as jest.MockedFunction<typeof auditsDbQueries.setAuditsForInterview>;
mockSetAudits.mockImplementation(async (_interviewId, audits) => audits);
const mockUpdateAudit = auditsDbQueries.updateAudit as jest.MockedFunction<typeof auditsDbQueries.updateAudit>;
const mockAuditInterview = jest.mocked(AuditService.auditInterview);

// helper (place near top of file)
const makeServiceResult = (audits: AuditForObject[]) => ({
    interview: {} as Interview,
    household: {} as Household,
    home: {} as Home,
    audits,
    auditsByObject: { interview: [], household: [], home: [], persons: {}, journeys: {}, visitedPlaces: {}, trips: {}, segments: {} }
});

const interviewId = 3;

describe('updateAudits', () => {

    beforeEach(() => {
        mockUpdateAudit.mockClear();
    });

    test('update empty list of audits', async () => {
        await SurveyObjectsAndAuditsFactory.updateAudits(3, []);
        expect(mockUpdateAudit).not.toHaveBeenCalled();
    });

    test('update single audit', async () => {
        const audits = [{
            version: 3,
            objectType: 'person',
            objectUuid: 'arbitrary',
            errorCode: 'err-code'
        }];
        await SurveyObjectsAndAuditsFactory.updateAudits(interviewId, audits);
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
        await SurveyObjectsAndAuditsFactory.updateAudits(interviewId, audits);
        expect(mockUpdateAudit).toHaveBeenCalledTimes(audits.length);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[0]);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[1]);
        expect(mockUpdateAudit).toHaveBeenCalledWith(interviewId, audits[2]);
    });
});

describe('createSurveyObjectsAndSaveAuditsToDb', () => {

    const interviewAttributes = {
        id: interviewId,
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        participant_id: 1,
        is_valid: true,
        response: {},
        validations: {},
        is_completed: false,
        corrected_response: {}
    };

    // Mock audits returned by AuditService
    const mockAuditsFromService: AuditForObject[] = [
        {
            objectType: 'interview',
            objectUuid: 'interview-uuid-123',
            errorCode: 'TEST_ERROR_1',
            version: 1,
            level: 'error',
            message: 'Test error 1',
            ignore: false
        },
        {
            objectType: 'household',
            objectUuid: 'household-uuid-123',
            errorCode: 'TEST_ERROR_2',
            version: 1,
            level: 'warning',
            message: 'Test warning 2',
            ignore: false
        }
    ];

    beforeEach(() => {
        mockSetAudits.mockClear();
        mockAuditInterview.mockClear();
        // Mock AuditService to return dummy audits
        mockAuditInterview.mockResolvedValue(makeServiceResult(mockAuditsFromService));
    });

    test('corrected_response not set in interview', async () => {
        await expect(SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(_omit(interviewAttributes, 'corrected_response')))
            .rejects.toThrow('Corrected response is required to create survey objects and audits');
        expect(mockAuditInterview).not.toHaveBeenCalled();
    });

    test('Function calls AuditService and returns audits', async () => {
        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interviewAttributes);

        // Should call AuditService
        expect(mockAuditInterview).toHaveBeenCalledTimes(1);
        expect(mockAuditInterview).toHaveBeenCalledWith(interviewAttributes);

        // Should return the audits from AuditService
        expect(objectsAndAudits.audits).toEqual(mockAuditsFromService);

        // Database should be called to save the audits
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, mockAuditsFromService);
    });

    test('Function saves audits to database and returns updated audits', async () => {
        // Mock the database to add ignore status to all audits when saving
        const updatedAudits = mockAuditsFromService.map((audit) => ({ ...audit, ignore: true }));
        mockSetAudits.mockResolvedValueOnce(updatedAudits);

        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interviewAttributes);

        // Should call AuditService
        expect(mockAuditInterview).toHaveBeenCalledTimes(1);

        // All audits should have the ignore flag set by the database mock
        expect(objectsAndAudits.audits.every((audit) => audit.ignore === true)).toBe(true);

        // auditsByObject should reflect the updated audits
        expect(objectsAndAudits.auditsByObject?.interview ?? []).toEqual(
            expect.arrayContaining([expect.objectContaining({ objectType: 'interview', ignore: true })])
        );
        expect(objectsAndAudits.auditsByObject?.household ?? []).toEqual(
            expect.arrayContaining([expect.objectContaining({ objectType: 'household', ignore: true })])
        );

        // Database should be called to save the audits
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, mockAuditsFromService);
    });

    test('Function handles empty audits array', async () => {
        // Mock AuditService to return no audits
        mockAuditInterview.mockResolvedValueOnce(makeServiceResult([]));

        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interviewAttributes);

        // Should call AuditService
        expect(mockAuditInterview).toHaveBeenCalledTimes(1);

        // Should have no audits
        expect(objectsAndAudits.audits).toEqual([]);

        // auditsByObject should be properly initialized even with no audits
        expect(objectsAndAudits.auditsByObject).toBeDefined();
        expect(objectsAndAudits.auditsByObject?.interview).toEqual([]);
        expect(objectsAndAudits.auditsByObject?.household).toEqual([]);

        // Database should still be called even with empty array
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, []);
    });
});

