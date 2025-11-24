/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BatchAuditService, runBatchAuditsTask, BatchAuditTaskParams, BATCH_SIZE } from '../BatchAuditService';
import Interviews from '../../interviews/interviews';
import { copyResponseToCorrectedResponse } from '../../interviews/interview';
import { SurveyObjectsAndAuditsFactory } from '../SurveyObjectsAndAuditsFactory';
import { execJob } from '../../../tasks/serverWorkerPool';
import { InterviewAttributes, InterviewListAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { isOk, hasErrors } from 'evolution-common/lib/types/Result.type';
import { OperatorSigns, VALID_OPERATORS } from '../../../models/interviews.db.queries';

// Mock the dependencies
jest.mock('../../interviews/interviews');
jest.mock('../../interviews/interview');
jest.mock('../SurveyObjectsAndAuditsFactory');
jest.mock('../../../tasks/serverWorkerPool');

describe('BatchAuditService', () => {
    const mockInterviewUuid1 = uuidV4();
    const mockInterviewUuid2 = uuidV4();
    const mockInterviewUuid3 = uuidV4();

    const createMockInterview = (uuid: string): InterviewAttributes => ({
        id: 123,
        uuid,
        participant_id: 456,
        is_valid: false,
        is_completed: false,
        response: {
            _uuid: uuid,
            household: {
                _uuid: uuidV4(),
                size: 2
            }
        },
        corrected_response: {
            _uuid: uuid,
            household: {
                _uuid: uuidV4(),
                size: 2
            }
        },
        validations: {},
        logs: []
    } as InterviewAttributes);

    const createMockInterviewListItem = (uuid: string): InterviewListAttributes => ({
        uuid,
        id: 123,
        participant_id: 456,
        is_valid: false,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    } as InterviewListAttributes);

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementations
        (copyResponseToCorrectedResponse as jest.Mock).mockResolvedValue(undefined);
        (SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb as jest.Mock).mockResolvedValue(
            undefined
        );
        // Reset getAllMatching mock to avoid interference between tests
        (Interviews.getAllMatching as jest.Mock).mockReset();
    });

    describe('runBatchAuditsTask', () => {
        it('should return empty results when no interviews match filters', async () => {
            (Interviews.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 0
            });

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            expect(result).toEqual({
                totalCount: 0,
                processed: 0,
                succeeded: 0,
                failed: 0,
                results: []
            });
            expect(Interviews.getAllMatching).toHaveBeenCalledWith({
                pageIndex: 0,
                pageSize: BATCH_SIZE,
                filter: {},
                updatedAt: 0,
                sort: undefined
            });
        });

        it('should process single interview successfully', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            expect(result.totalCount).toBe(1);
            expect(result.processed).toBe(1);
            expect(result.succeeded).toBe(1);
            expect(result.failed).toBe(0);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                uuid: mockInterviewUuid1,
                status: 'success'
            });
            expect(Interviews.getInterviewByUuid).toHaveBeenCalledWith(mockInterviewUuid1);
            expect(SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb).toHaveBeenCalledWith(
                interview1,
                false
            );
        });

        it('should copy response to corrected_response when missing', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            interview1.corrected_response = undefined as any;
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            await runBatchAuditsTask(params);

            expect(copyResponseToCorrectedResponse).toHaveBeenCalledWith(interview1);
        });

        it('should not copy response when corrected_response exists', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            await runBatchAuditsTask(params);

            expect(copyResponseToCorrectedResponse).not.toHaveBeenCalled();
        });

        it('should process multiple interviews in batches', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interview2 = createMockInterview(mockInterviewUuid2);
            const interview3 = createMockInterview(mockInterviewUuid3);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);
            const interviewListItem2 = createMockInterviewListItem(mockInterviewUuid2);
            const interviewListItem3 = createMockInterviewListItem(mockInterviewUuid3);

            // First call gets first page (to get totalCount), all 3 interviews fit in one page (BATCH_SIZE=10)
            (Interviews.getAllMatching as jest.Mock).mockResolvedValueOnce({
                interviews: [interviewListItem1, interviewListItem2, interviewListItem3],
                totalCount: 3
            });
            (Interviews.getInterviewByUuid as jest.Mock)
                .mockResolvedValueOnce(interview1)
                .mockResolvedValueOnce(interview2)
                .mockResolvedValueOnce(interview3);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            expect(result.totalCount).toBe(3);
            expect(result.processed).toBe(3);
            expect(result.succeeded).toBe(3);
            expect(result.failed).toBe(0);
            expect(result.results).toHaveLength(3);
            expect(Interviews.getInterviewByUuid).toHaveBeenCalledTimes(3);
        });

        it('should handle interview not found error', async () => {
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            // First call gets first page (to get totalCount)
            (Interviews.getAllMatching as jest.Mock).mockResolvedValueOnce({
                interviews: [interviewListItem1],
                totalCount: 1
            });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(undefined);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            expect(result.totalCount).toBe(1);
            expect(result.processed).toBe(1);
            expect(result.succeeded).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.results[0]).toEqual({
                uuid: mockInterviewUuid1,
                status: 'failed',
                error: 'Interview not found'
            });
        });

        it('should handle audit processing errors', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);
            (SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb as jest.Mock).mockRejectedValue(
                new Error('Audit failed')
            );

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            expect(result.totalCount).toBe(1);
            expect(result.processed).toBe(1);
            expect(result.succeeded).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.results[0]).toEqual({
                uuid: mockInterviewUuid1,
                status: 'failed',
                error: 'Error processing interview'
            });
        });

        it('should handle mixed success and failure', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);
            const interviewListItem2 = createMockInterviewListItem(mockInterviewUuid2);

            // First call gets first page (to get totalCount), both interviews fit in one page
            (Interviews.getAllMatching as jest.Mock).mockResolvedValueOnce({
                interviews: [interviewListItem1, interviewListItem2],
                totalCount: 2
            });
            (Interviews.getInterviewByUuid as jest.Mock)
                .mockResolvedValueOnce(interview1)
                .mockResolvedValueOnce(undefined); // Second interview not found

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            expect(result.totalCount).toBe(2);
            expect(result.processed).toBe(2);
            expect(result.succeeded).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.results).toHaveLength(2);
            expect(result.results[0].status).toBe('success');
            expect(result.results[1].status).toBe('failed');
        });

        it('should parse string filters correctly', async () => {
            (Interviews.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 0
            });

            const params: BatchAuditTaskParams = {
                filters: {
                    'response.accessCode': 'ABC123',
                    'response.household.size': ['1', '2']
                },
                extended: false
            };

            await runBatchAuditsTask(params);

            expect(Interviews.getAllMatching).toHaveBeenCalledWith({
                pageIndex: 0,
                pageSize: BATCH_SIZE,
                filter: {
                    'response.accessCode': 'ABC123',
                    'response.household.size': ['1', '2']
                },
                updatedAt: 0,
                sort: undefined
            });
        });

        it('should parse object filters correctly', async () => {
            (Interviews.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 0
            });

            const params: BatchAuditTaskParams = {
                filters: {
                    'response.household.size': {
                        value: 2,
                        op: 'eq'
                    }
                },
                extended: false
            };

            await runBatchAuditsTask(params);

            expect(Interviews.getAllMatching).toHaveBeenCalledWith({
                pageIndex: 0,
                pageSize: BATCH_SIZE,
                filter: {
                    'response.household.size': {
                        value: 2,
                        op: 'eq'
                    }
                },
                updatedAt: 0,
                sort: undefined
            });
        });

        it('should throw error for invalid filter structure (object without value)', async () => {
            const params: BatchAuditTaskParams = {
                filters: {
                    'response.household.size': {
                        op: 'eq'
                        // Missing 'value' property
                    }
                },
                extended: false
            };

            await expect(runBatchAuditsTask(params)).rejects.toThrow(
                'Invalid filter structure for keys: response.household.size'
            );
        });

        it('should throw error for invalid filter value type', async () => {
            const params: BatchAuditTaskParams = {
                filters: {
                    'response.household.size': {
                        value: { nested: 'object' }, // Invalid value type
                        op: 'eq'
                    }
                },
                extended: false
            };

            await expect(runBatchAuditsTask(params)).rejects.toThrow(
                'Invalid filter structure for keys: response.household.size'
            );
        });

        it('should throw error for invalid operator', async () => {
            const params: BatchAuditTaskParams = {
                filters: {
                    'response.household.size': {
                        value: 2,
                        op: 'invalidOp' // Invalid operator
                    }
                },
                extended: false
            };

            await expect(runBatchAuditsTask(params)).rejects.toThrow(
                'Invalid filter structure for keys: response.household.size'
            );
        });

        it('should throw error for multiple invalid filters', async () => {
            const params: BatchAuditTaskParams = {
                filters: {
                    'response.household.size': {
                        value: { invalid: 'type' }
                    },
                    'response.accessCode': {
                        op: 'eq'
                        // Missing value
                    },
                    'response.valid': 'validString' // This one is valid
                },
                extended: false
            };

            await expect(runBatchAuditsTask(params)).rejects.toThrow(
                'Invalid filter structure for keys: response.household.size, response.accessCode'
            );
        });

        it('should accept valid GeoJSON Polygon feature as filter value', async () => {
            (Interviews.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 0
            });

            const validPolygonFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [0, 0],
                            [1, 0],
                            [1, 1],
                            [0, 1],
                            [0, 0]
                        ]
                    ]
                },
                properties: {}
            };

            const params: BatchAuditTaskParams = {
                filters: {
                    'response.home.geography': {
                        value: validPolygonFeature,
                        op: 'eq'
                    }
                },
                extended: false
            };

            await runBatchAuditsTask(params);

            expect(Interviews.getAllMatching).toHaveBeenCalledWith({
                pageIndex: 0,
                pageSize: BATCH_SIZE,
                filter: {
                    'response.home.geography': {
                        value: validPolygonFeature,
                        op: 'eq'
                    }
                },
                updatedAt: 0,
                sort: undefined
            });
        });

        it('should reject invalid GeoJSON feature (not a Polygon)', async () => {
            const invalidFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                },
                properties: {}
            };

            const params: BatchAuditTaskParams = {
                filters: {
                    'response.home.geography': {
                        value: invalidFeature,
                        op: 'eq'
                    }
                },
                extended: false
            };

            await expect(runBatchAuditsTask(params)).rejects.toThrow(
                'Invalid filter structure for keys: response.home.geography'
            );
        });

        it('should accept all valid operator types', async () => {
            (Interviews.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 0
            });

            for (const op of VALID_OPERATORS) {
                const params: BatchAuditTaskParams = {
                    filters: {
                        [`test.${op}`]: {
                            value: 2,
                            op: op as keyof OperatorSigns
                        }
                    },
                    extended: false
                };

                await runBatchAuditsTask(params);
            }

            // When totalCount is 0, it returns early after the first call, so only one call per operator
            expect(Interviews.getAllMatching).toHaveBeenCalledTimes(VALID_OPERATORS.length);
        });

        it('should use extended audit checks when extended=true', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: true
            };

            await runBatchAuditsTask(params);

            expect(SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb).toHaveBeenCalledWith(
                interview1,
                true
            );
        });

        it('should use extended audit checks when extended="true"', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: 'true'
            };

            await runBatchAuditsTask(params);

            expect(SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb).toHaveBeenCalledWith(
                interview1,
                true
            );
        });

        it('should not use extended audit checks when extended=false', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            await runBatchAuditsTask(params);

            expect(SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb).toHaveBeenCalledWith(
                interview1,
                false
            );
        });

        it('should log userId when provided', async () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                })
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1],
                    totalCount: 1
                });
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false,
                userId: 123
            };

            await runBatchAuditsTask(params);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('userId=123')
            );

            consoleSpy.mockRestore();
        });

        it('should reject requests exceeding maximum interview limit', async () => {
            const originalEnv = process.env.BATCH_AUDIT_MAX_INTERVIEWS;
            process.env.BATCH_AUDIT_MAX_INTERVIEWS = '100';

            // Reload the module to pick up the new env var
            jest.resetModules();
            const BatchAuditServiceModule = await import('../BatchAuditService');
            const { runBatchAuditsTask: reloadedTask } = BatchAuditServiceModule;
            // Re-import Interviews after module reset
            const InterviewsModule = await import('../../interviews/interviews');

            (InterviewsModule.default.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 150 // Exceeds limit of 100
            });

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            await expect(reloadedTask(params)).rejects.toThrow(
                'Batch audit request exceeds maximum limit of 100 interviews. Found 150 matching interviews. Please refine your filters.'
            );

            // Restore original env
            if (originalEnv) {
                process.env.BATCH_AUDIT_MAX_INTERVIEWS = originalEnv;
            } else {
                delete process.env.BATCH_AUDIT_MAX_INTERVIEWS;
            }
            jest.resetModules();
        });

        it('should accept requests within maximum interview limit', async () => {
            const interview1 = createMockInterview(mockInterviewUuid1);
            const interviewListItem1 = createMockInterviewListItem(mockInterviewUuid1);

            // First call gets first page (to get totalCount)
            // This test verifies that totalCount=50 (within default limit of 10000) is accepted
            // We only mock 1 interview to keep the test simple - the important part is that it doesn't throw
            // With totalCount=50 and BATCH_SIZE=10, we need 5 pages total (pageIndex 0-4)
            (Interviews.getAllMatching as jest.Mock)
                .mockResolvedValueOnce({
                    interviews: [interviewListItem1], // First page (pageIndex 0) has 1 interview
                    totalCount: 50 // Total count is 50, which is within the limit
                })
                // Mock remaining pages (pageIndex 1-4) with empty arrays since we only care about the limit check
                .mockResolvedValueOnce({ interviews: [], totalCount: 50 }) // pageIndex 1
                .mockResolvedValueOnce({ interviews: [], totalCount: 50 }) // pageIndex 2
                .mockResolvedValueOnce({ interviews: [], totalCount: 50 }) // pageIndex 3
                .mockResolvedValueOnce({ interviews: [], totalCount: 50 }); // pageIndex 4
            (Interviews.getInterviewByUuid as jest.Mock).mockResolvedValue(interview1);

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            const result = await runBatchAuditsTask(params);

            // The function should accept this request (not throw) and process what's available
            expect(result.totalCount).toBe(50);
            expect(result.processed).toBe(1); // Only processed the 1 interview from first page
        });

        it('should use configurable batch size from environment variable', async () => {
            const originalEnv = process.env.BATCH_AUDIT_CONCURRENCY;
            process.env.BATCH_AUDIT_CONCURRENCY = '5';

            // Reload the module to pick up the new env var
            jest.resetModules();
            const BatchAuditServiceModule = await import('../BatchAuditService');
            const { runBatchAuditsTask: reloadedTask } = BatchAuditServiceModule;
            // Re-import Interviews after module reset
            const InterviewsModule = await import('../../interviews/interviews');

            (InterviewsModule.default.getAllMatching as jest.Mock).mockResolvedValue({
                interviews: [],
                totalCount: 0
            });

            const params: BatchAuditTaskParams = {
                filters: {},
                extended: false
            };

            await reloadedTask(params);

            expect(InterviewsModule.default.getAllMatching).toHaveBeenCalledWith(
                expect.objectContaining({
                    pageSize: 5 // Should use the configured batch size
                })
            );

            // Restore original env
            if (originalEnv) {
                process.env.BATCH_AUDIT_CONCURRENCY = originalEnv;
            } else {
                delete process.env.BATCH_AUDIT_CONCURRENCY;
            }
            jest.resetModules();
        });
    });

    describe('BatchAuditService.runBatchAudits', () => {
        it('should call execJob with correct parameters', async () => {
            const mockResult = {
                totalCount: 1,
                processed: 1,
                succeeded: 1,
                failed: 0,
                results: [
                    {
                        uuid: mockInterviewUuid1,
                        status: 'success' as const
                    }
                ]
            };

            (execJob as jest.Mock).mockResolvedValue(mockResult);

            const result = await BatchAuditService.runBatchAudits({}, false, 123);

            expect(execJob).toHaveBeenCalledWith('runBatchAudits', [
                {
                    filters: {},
                    extended: false,
                    userId: 123
                }
            ]);
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.result).toEqual(mockResult);
            }
        });

        it('should return error result when execJob throws', async () => {
            const error = new Error('Worker pool error');
            (execJob as jest.Mock).mockRejectedValue(error);

            const result = await BatchAuditService.runBatchAudits({}, false);

            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors).toHaveLength(1);
                expect(result.errors[0].message).toBe('Worker pool error');
            }
        });

        it('should handle non-Error exceptions', async () => {
            (execJob as jest.Mock).mockRejectedValue('String error');

            const result = await BatchAuditService.runBatchAudits({}, false);

            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                expect(result.errors).toHaveLength(1);
                expect(result.errors[0].message).toBe('String error');
            }
        });

        it('should pass filters and extended flag correctly', async () => {
            const mockResult = {
                totalCount: 0,
                processed: 0,
                succeeded: 0,
                failed: 0,
                results: []
            };

            (execJob as jest.Mock).mockResolvedValue(mockResult);

            const filters = {
                'response.accessCode': 'ABC123',
                'response.household.size': { value: 2, op: 'eq' }
            };

            await BatchAuditService.runBatchAudits(filters, true, 456);

            expect(execJob).toHaveBeenCalledWith('runBatchAudits', [
                {
                    filters,
                    extended: true,
                    userId: 456
                }
            ]);
        });
    });
});

