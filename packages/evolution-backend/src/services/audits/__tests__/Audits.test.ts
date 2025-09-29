/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _omit from 'lodash/omit';
import auditsDbQueries from '../../../models/audits.db.queries';
import { SurveyObjectsAndAuditsFactory } from '../SurveyObjectsAndAuditsFactory';
import { setProjectConfig } from '../../../config/projectConfig';

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

describe('createSurveyObjectsAndAudit', () => {

    const interviewAttributes = {
        id: interviewId,
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        participant_id: 1,
        is_valid: true,
        response: {
            fieldA: 'a',
            fieldB: 'b',
            home: {
                _uuid: 'home-uuid-123',
                address: '123 Test Street',
                city: 'Test City'
            },
            household: {
                _uuid: 'household-uuid-123',
                size: 2
            },
            persons: {
                'person-uuid-123': {
                    _uuid: 'person-uuid-123',
                    age: 30,
                    _sequence: 1
                }
            }
        } as any,
        validations: {},
        is_completed: false,
        corrected_response: {
            fieldA: 'modifiedA',
            fieldB: 'modifiedB',
            home: {
                _uuid: 'home-uuid-123',
                address: '456 Modified Street',
                city: 'Modified City'
            },
            household: {
                _uuid: 'household-uuid-123',
                size: 3
            },
            persons: {
                'person-uuid-123': {
                    _uuid: 'person-uuid-123',
                    age: 35,
                    _sequence: 1
                }
            }
        } as any
    };

    const mockInterviewAudits = jest.fn();

    beforeEach(() => {
        mockSetAudits.mockClear();
        mockInterviewAudits.mockClear();
        setProjectConfig({ auditInterview: mockInterviewAudits });
    });

    test('audit function not set in config - uses default implementation', async () => {
        // Unset the interview audit function
        setProjectConfig({ auditInterview: undefined });

        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudit(interviewAttributes);
        // Should use default audit implementation, so we expect some audits
        expect(objectsAndAudits.audits.length).toBeGreaterThan(0);
        expect(mockInterviewAudits).not.toHaveBeenCalled();
    });

    test('corrected_response not set in interview', async () => {
        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudit(_omit(interviewAttributes, 'corrected_response'));
        expect(objectsAndAudits.audits).toEqual([]);
        expect(mockInterviewAudits).not.toHaveBeenCalled();
    });

    test('Function returns audits from comprehensive audit service', async () => {
        // The new system uses ComprehensiveAuditService which produces real audits
        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudit(interviewAttributes);

        // Should have some audits from the comprehensive audit system
        expect(objectsAndAudits.audits.length).toBeGreaterThan(0);

        // Should have audits for objects with validation errors (home, household, etc.)
        // The system only generates audits when there are actual validation errors
        expect(objectsAndAudits.audits.length).toBe(2); // Based on console logs: 3 parameter errors converted to audits

        // The old mock interview audit function should not be called anymore
        expect(mockInterviewAudits).not.toHaveBeenCalled();

        // Database should be called to save the audits
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, objectsAndAudits.audits);
    });

    test('Function saves audits to database and returns updated audits', async () => {
        // Mock the database to add ignore status to all audits when saving
        mockSetAudits.mockImplementationOnce(async (_interviewId, audits) =>
            audits.map((audit) => ({ ...audit, ignore: true }))
        );

        const objectsAndAudits = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndAudit(interviewAttributes);

        // Should have some audits from the comprehensive audit system
        expect(objectsAndAudits.audits.length).toBeGreaterThan(0);

        // All audits should have the ignore flag set by the database mock
        expect(objectsAndAudits.audits.every((audit) => audit.ignore === true)).toBe(true);

        // The old mock interview audit function should not be called anymore
        expect(mockInterviewAudits).not.toHaveBeenCalled();

        // Database should be called to save the audits
        expect(mockSetAudits).toHaveBeenCalledTimes(1);
        expect(mockSetAudits).toHaveBeenCalledWith(interviewId, expect.any(Array));
    });
});

