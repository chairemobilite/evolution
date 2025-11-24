/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import Interviews, { FilterType } from '../interviews/interviews';
import { copyResponseToCorrectedResponse } from '../interviews/interview';
import { SurveyObjectsAndAuditsFactory } from './SurveyObjectsAndAuditsFactory';
import { Result, createOk, createErrors } from 'evolution-common/lib/types/Result.type';
import { execJob } from '../../tasks/serverWorkerPool';
import { ValueFilterType, VALID_OPERATORS } from '../../models/interviews.db.queries';
import { isFeature } from 'geojson-validation';

/**
 * Result for a single interview audit operation
 */
export interface InterviewAuditResult {
    uuid: string;
    status: 'success' | 'failed';
    error?: string;
}

/**
 * Complete batch audit operation result
 */
export interface BatchAuditResult {
    totalCount: number;
    processed: number;
    succeeded: number;
    failed: number;
    results: InterviewAuditResult[];
}

/**
 * Parameters for batch audit task
 */
export interface BatchAuditTaskParams {
    filters: Record<string, unknown>;
    extended: boolean | string | undefined;
    userId?: number;
}

/**
 * Number of interviews to process concurrently per batch
 * Can be overridden via BATCH_AUDIT_CONCURRENCY environment variable
 */
const parsedBatchSize = parseInt(process.env.BATCH_AUDIT_CONCURRENCY || '10', 10);
export const BATCH_SIZE = isNaN(parsedBatchSize) || parsedBatchSize <= 0 ? 10 : parsedBatchSize;

/**
 * Maximum number of interviews that can be processed in a single batch audit job
 * Can be overridden via BATCH_AUDIT_MAX_INTERVIEWS environment variable
 * Default: 10000 interviews
 */
const parsedMaxInterviews = parseInt(process.env.BATCH_AUDIT_MAX_INTERVIEWS || '10000', 10);
const MAX_INTERVIEWS_PER_BATCH = isNaN(parsedMaxInterviews) || parsedMaxInterviews <= 0 ? 10000 : parsedMaxInterviews;

/**
 * Type guard to validate if an object is a valid ValueFilterType
 */
const isValidValueFilterType = (value: unknown): value is ValueFilterType => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    const obj = value as Record<string, unknown>;

    // Must have a 'value' property
    if (!('value' in obj)) {
        return false;
    }

    const filterValue = obj.value;

    // Validate value type
    let isValidValueType =
        typeof filterValue === 'string' ||
        typeof filterValue === 'boolean' ||
        typeof filterValue === 'number' ||
        filterValue === null ||
        Array.isArray(filterValue);

    // Check for GeoJSON Polygon feature
    if (!isValidValueType && typeof filterValue === 'object') {
        if (isFeature(filterValue)) {
            const feature = filterValue as GeoJSON.Feature;
            isValidValueType = feature.geometry?.type === 'Polygon';
        }
    }

    if (!isValidValueType) {
        return false;
    }

    // If 'op' is present, validate it's a valid operator
    if ('op' in obj && obj.op !== undefined) {
        if (typeof obj.op !== 'string' || !VALID_OPERATORS.includes(obj.op as (typeof VALID_OPERATORS)[number])) {
            return false;
        }
    }

    return true;
};

/**
 * Parse filters from request body, similar to validationList route
 * Validates filter structure at runtime to ensure type safety
 */
const parseFilters = (filters: Record<string, unknown>): { [key: string]: FilterType } => {
    const actualFilters: { [key: string]: FilterType } = {};
    const invalidKeys: string[] = [];

    Object.keys(filters).forEach((key) => {
        const filterValue = filters[key];
        if (typeof filterValue === 'string' || Array.isArray(filterValue)) {
            actualFilters[key] = filterValue;
        } else if (isValidValueFilterType(filterValue)) {
            actualFilters[key] = filterValue;
        } else {
            invalidKeys.push(key);
        }
    });

    if (invalidKeys.length > 0) {
        throw new Error(`Invalid filter structure for keys: ${invalidKeys.join(', ')}`);
    }

    return actualFilters;
};

/**
 * Process a single interview audit
 */
const processInterviewAudit = async (
    interviewUuid: string,
    runExtendedAuditChecks: boolean
): Promise<InterviewAuditResult> => {
    try {
        const interview = await Interviews.getInterviewByUuid(interviewUuid);
        if (!interview) {
            return {
                uuid: interviewUuid,
                status: 'failed',
                error: 'Interview not found'
            };
        }

        // Copy response to corrected_response if needed
        if (_isBlank(interview.corrected_response)) {
            await copyResponseToCorrectedResponse(interview);
        }

        // Run audits
        await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(interview, runExtendedAuditChecks);

        return {
            uuid: interviewUuid,
            status: 'success'
        };
    } catch (error) {
        console.error(`Error processing interview ${interviewUuid}: ${error}`);
        return {
            uuid: interviewUuid,
            status: 'failed',
            error: 'Error processing interview'
        };
    }
};

/**
 * Task to run batch audits on interviews matching the provided filters
 *
 * NOTE: THIS SHOULD ONLY BE CALLED FROM A WORKERPOOL OR TASK, NOT THE MAIN
 * THREAD
 *
 * @param params - Batch audit parameters
 * @returns Batch audit results
 */
export const runBatchAuditsTask = async function (params: BatchAuditTaskParams): Promise<BatchAuditResult> {
    const { filters, extended, userId } = params;
    const runExtendedAuditChecks = _booleish(extended) ?? false;
    const actualFilters = parseFilters(filters);

    // Fetch first page to get total count and start processing
    const firstPageResponse = await Interviews.getAllMatching({
        pageIndex: 0,
        pageSize: BATCH_SIZE,
        filter: actualFilters,
        updatedAt: 0,
        sort: undefined
    });

    const totalCount = firstPageResponse.totalCount;

    if (totalCount === 0) {
        return {
            totalCount: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            results: []
        };
    }

    // Enforce maximum limit to prevent memory issues and long-running tasks
    if (totalCount > MAX_INTERVIEWS_PER_BATCH) {
        const errorMessage = `Batch audit request exceeds maximum limit of ${MAX_INTERVIEWS_PER_BATCH} interviews. Found ${totalCount} matching interviews. Please refine your filters.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    console.info(
        `Batch audit started: totalCount=${totalCount} extended=${runExtendedAuditChecks} userId=${userId ?? 'undefined'} batchSize=${BATCH_SIZE} maxLimit=${MAX_INTERVIEWS_PER_BATCH}`
    );

    // Process interviews in batches with concurrency control
    // Fetch data in batches to avoid loading all interviews in memory at once
    const results: InterviewAuditResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let processed = 0;

    // Process first page (already fetched)
    const processPage = async (interviewListItems: typeof firstPageResponse.interviews) => {
        const batchPromises = interviewListItems.map((interviewListItem) =>
            processInterviewAudit(interviewListItem.uuid, runExtendedAuditChecks)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        processed += batchResults.length;

        batchResults.forEach((result) => {
            if (result.status === 'success') {
                succeeded++;
            } else {
                failed++;
            }
        });

        // Log progress
        console.info(
            `Batch audit progress: ${processed}/${totalCount} processed (${succeeded} succeeded, ${failed} failed)`
        );
    };

    // Process first page
    await processPage(firstPageResponse.interviews);

    // Calculate remaining pages and process them
    const totalPages = Math.ceil(totalCount / BATCH_SIZE);

    for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
        // Fetch interview list items for this page
        const pageResponse = await Interviews.getAllMatching({
            pageIndex,
            pageSize: BATCH_SIZE,
            filter: actualFilters,
            updatedAt: 0,
            sort: undefined
        });

        await processPage(pageResponse.interviews);
    }

    console.info(
        `Batch audit completed: totalCount=${totalCount} succeeded=${succeeded} failed=${failed} extended=${runExtendedAuditChecks}`
    );

    return {
        totalCount,
        processed: results.length,
        succeeded,
        failed,
        results
    };
};

/**
 * Service for running batch audits on multiple interviews
 * Processes interviews in batches with concurrency control to avoid overwhelming the system
 */
export class BatchAuditService {
    /**
     * Run batch audits on interviews matching the provided filters
     * The actual work is done in a worker pool to avoid blocking the main thread
     * @param filters - Filter criteria to match interviews
     * @param extended - Whether to run extended audit checks
     * @param userId - Optional user ID for logging
     * @returns Result containing batch audit results or errors
     */
    static async runBatchAudits(
        filters: Record<string, unknown>,
        extended: boolean | string | undefined,
        userId?: number
    ): Promise<Result<BatchAuditResult>> {
        try {
            const result = await execJob('runBatchAudits', [
                {
                    filters,
                    extended,
                    userId
                }
            ]);

            // Validate result structure
            if (
                !result ||
                typeof result !== 'object' ||
                Array.isArray(result) ||
                !('totalCount' in result) ||
                !('processed' in result) ||
                !('succeeded' in result) ||
                !('failed' in result) ||
                !('results' in result)
            ) {
                throw new Error('Invalid result structure from worker');
            }

            // Validate field types
            const workerResult = result as Record<string, unknown>;
            if (
                typeof workerResult.totalCount !== 'number' ||
                !Number.isFinite(workerResult.totalCount) ||
                typeof workerResult.processed !== 'number' ||
                !Number.isFinite(workerResult.processed) ||
                typeof workerResult.succeeded !== 'number' ||
                !Number.isFinite(workerResult.succeeded) ||
                typeof workerResult.failed !== 'number' ||
                !Number.isFinite(workerResult.failed) ||
                !Array.isArray(workerResult.results)
            ) {
                throw new Error('Invalid result structure from worker');
            }

            return createOk(result as BatchAuditResult);
        } catch (error) {
            console.error('Error running batch audits:', error);
            const errorObj = error instanceof Error ? error : new Error(String(error));
            return createErrors([errorObj]);
        }
    }
}
