/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { SurveyObjectsAndAuditsFactory } from '../SurveyObjectsAndAuditsFactory';
import { AuditService } from '../AuditService';
import auditsDbQueries from '../../../models/audits.db.queries';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

// Mock the dependencies
jest.mock('../AuditService');
jest.mock('../../../models/audits.db.queries');

describe('SurveyObjectsAndAuditsFactory', () => {
    const mockInterviewUuid = uuidV4();
    const mockHouseholdUuid = uuidV4();

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
        (AuditService.auditInterview as jest.Mock).mockResolvedValue({
            interview: { _uuid: mockInterviewUuid },
            household: { _uuid: mockHouseholdUuid },
            home: { _uuid: 'home-uuid' },
            audits: [
                {
                    objectType: 'interview',
                    objectUuid: mockInterviewUuid,
                    errorCode: 'TEST_AUDIT',
                    version: 1,
                    level: 'warning',
                    message: 'Test audit',
                    ignore: false
                }
            ],
            auditsByObject: {
                interview: [],
                household: [],
                home: [],
                persons: {},
                journeys: {},
                visitedPlaces: {},
                trips: {},
                segments: {}
            }
        });

        (auditsDbQueries.setAuditsForInterview as jest.Mock).mockResolvedValue([
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

    describe('createSurveyObjectsAndSaveAuditsToDb', () => {
        it('should throw error when corrected_response is missing', async () => {
            const interview = createMockInterview();
            interview.corrected_response = undefined as any;

            await expect(
                SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview)
            ).rejects.toThrow('Corrected response is required to create survey objects and audits');

            expect(AuditService.auditInterview).not.toHaveBeenCalled();
        });

        it('should pass runExtendedAuditChecks=false by default to AuditService', async () => {
            const interview = createMockInterview();

            await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview);

            expect(AuditService.auditInterview).toHaveBeenCalledWith(interview, false);
        });

        it('should pass runExtendedAuditChecks=true to AuditService when flag is true', async () => {
            const interview = createMockInterview();

            await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview, true);

            expect(AuditService.auditInterview).toHaveBeenCalledWith(interview, true);
        });

        it('should pass runExtendedAuditChecks=false to AuditService when flag is false', async () => {
            const interview = createMockInterview();

            await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview, false);

            expect(AuditService.auditInterview).toHaveBeenCalledWith(interview, false);
        });

        it('should create survey objects and save audits to database', async () => {
            const interview = createMockInterview();

            const result = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview);

            expect(AuditService.auditInterview).toHaveBeenCalledWith(interview, false);
            expect(auditsDbQueries.setAuditsForInterview).toHaveBeenCalledWith(
                interview.id,
                expect.arrayContaining([
                    expect.objectContaining({
                        errorCode: 'TEST_AUDIT'
                    })
                ])
            );
            expect(result.audits).toHaveLength(1);
        });

        it('should update auditsByObject after saving audits', async () => {
            const interview = createMockInterview();

            const result = await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview, true);

            expect(result.auditsByObject).toBeDefined();
            expect(result.audits).toHaveLength(1);
        });
    });
});

