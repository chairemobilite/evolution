/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { AuditService } from '../AuditService';
import { SurveyObjectAuditor } from '../SurveyObjectAuditor';
import { SurveyObjectsFactory } from '../../surveyObjects/SurveyObjectsFactory';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

// Mock the dependencies
jest.mock('../SurveyObjectAuditor');
jest.mock('../../surveyObjects/SurveyObjectsFactory');

describe('AuditService', () => {
    const mockInterviewUuid = uuidV4();
    const mockHouseholdUuid = uuidV4();
    const mockHomeUuid = uuidV4();

    const createMockInterview = (): InterviewAttributes => ({
        id: 123,
        uuid: mockInterviewUuid,
        participant_id: 456,
        is_valid: false,
        is_completed: false,
        response: {
            _uuid: mockInterviewUuid,
            household: {
                _uuid: mockHouseholdUuid,
                size: 2
            }
        },
        corrected_response: {
            _uuid: mockInterviewUuid,
            household: {
                _uuid: mockHouseholdUuid,
                size: 2
            }
        },
        validations: {},
        logs: []
    } as InterviewAttributes);

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementations
        (SurveyObjectsFactory.prototype.createAllObjectsWithErrors as jest.Mock) = jest
            .fn()
            .mockResolvedValue({
                interview: { _uuid: mockInterviewUuid },
                household: { _uuid: mockHouseholdUuid },
                home: { _uuid: mockHomeUuid },
                errorsByObject: {
                    interviewUuid: mockInterviewUuid,
                    householdUuid: mockHouseholdUuid,
                    homeUuid: mockHomeUuid,
                    interview: [],
                    household: [],
                    home: [],
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            });

        (SurveyObjectAuditor.auditSurveyObjects as jest.Mock) = jest.fn().mockResolvedValue([
            {
                objectType: 'interview',
                objectUuid: mockInterviewUuid,
                errorCode: 'TEST_AUDIT',
                version: 1,
                level: 'warning',
                message: 'Test audit',
                ignore: false
            }
        ]);
    });

    describe('auditInterview', () => {
        it('should return empty survey objects when interview has no response', async () => {
            const interview = createMockInterview();
            interview.response = undefined as any;

            const result = await AuditService.auditInterview(interview);

            expect(result).toEqual({
                audits: [],
                interview: undefined,
                household: undefined,
                home: undefined
            });
            expect(SurveyObjectsFactory.prototype.createAllObjectsWithErrors).not.toHaveBeenCalled();
            expect(SurveyObjectAuditor.auditSurveyObjects).not.toHaveBeenCalled();
        });

        it('should return empty survey objects when interview has no corrected response', async () => {
            const interview = createMockInterview();
            interview.corrected_response = undefined as any;

            const result = await AuditService.auditInterview(interview);

            expect(result).toEqual({
                audits: [],
                interview: undefined,
                household: undefined,
                home: undefined
            });
            expect(SurveyObjectsFactory.prototype.createAllObjectsWithErrors).not.toHaveBeenCalled();
            expect(SurveyObjectAuditor.auditSurveyObjects).not.toHaveBeenCalled();
        });

        it('should pass runExtendedAuditChecks=false by default to SurveyObjectAuditor', async () => {
            const interview = createMockInterview();

            await AuditService.auditInterview(interview);

            expect(SurveyObjectAuditor.auditSurveyObjects).toHaveBeenCalledWith(
                expect.objectContaining({
                    interview: expect.any(Object),
                    household: expect.any(Object),
                    home: expect.any(Object)
                }),
                false
            );
        });

        it('should pass runExtendedAuditChecks=true to SurveyObjectAuditor when flag is true', async () => {
            const interview = createMockInterview();

            await AuditService.auditInterview(interview, true);

            expect(SurveyObjectAuditor.auditSurveyObjects).toHaveBeenCalledWith(
                expect.objectContaining({
                    interview: expect.any(Object),
                    household: expect.any(Object),
                    home: expect.any(Object)
                }),
                true
            );
        });

        it('should pass runExtendedAuditChecks=false to SurveyObjectAuditor when flag is false', async () => {
            const interview = createMockInterview();

            await AuditService.auditInterview(interview, false);

            expect(SurveyObjectAuditor.auditSurveyObjects).toHaveBeenCalledWith(
                expect.objectContaining({
                    interview: expect.any(Object),
                    household: expect.any(Object),
                    home: expect.any(Object)
                }),
                false
            );
        });

        it('should create survey objects and run audits', async () => {
            const interview = createMockInterview();

            const result = await AuditService.auditInterview(interview);

            expect(SurveyObjectsFactory.prototype.createAllObjectsWithErrors).toHaveBeenCalledWith(interview);
            expect(SurveyObjectAuditor.auditSurveyObjects).toHaveBeenCalled();
            expect(result.audits).toHaveLength(1);
            expect(result.audits[0].errorCode).toBe('TEST_AUDIT');
        });

        it('should aggregate audits from parameter errors and object audits', async () => {
            const interview = createMockInterview();

            // Mock parameter errors
            (SurveyObjectsFactory.prototype.createAllObjectsWithErrors as jest.Mock).mockResolvedValue({
                interview: { _uuid: mockInterviewUuid },
                household: { _uuid: mockHouseholdUuid },
                home: { _uuid: mockHomeUuid },
                errorsByObject: {
                    interviewUuid: mockInterviewUuid,
                    householdUuid: mockHouseholdUuid,
                    homeUuid: mockHomeUuid,
                    interview: [
                        {
                            path: 'test.path',
                            message: 'Parameter error'
                        }
                    ],
                    household: [],
                    home: [],
                    personsByUuid: {},
                    journeysByUuid: {},
                    visitedPlacesByUuid: {},
                    tripsByUuid: {},
                    segmentsByUuid: {}
                }
            });

            const result = await AuditService.auditInterview(interview, false);

            // Should have both parameter error audit and object audit
            expect(result.audits.length).toBeGreaterThanOrEqual(2);
            expect(result.audits.some((a) => a.errorCode === 'TEST_AUDIT')).toBe(true);
            expect(result.audits.some((a) => a.objectType === 'interview' && a.errorCode !== 'TEST_AUDIT')).toBe(true);
        });
    });
});

