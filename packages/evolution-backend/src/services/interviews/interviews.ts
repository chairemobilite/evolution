/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import moment from 'moment';
import { updateInterview, copyResponseToCorrectedResponse } from './interview';
import { validateAccessCode, normalizeAccessCode } from '../accessCode';
import { validate as validateUuid } from 'uuid';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import interviewsDbQueries, {
    InterviewSearchAttributes,
    OperatorSigns,
    ValueFilterType
} from '../../models/interviews.db.queries';
import interviewsAccessesDbQueries from '../../models/interviewsAccesses.db.queries';
import reviewDecisionsDbQueries from '../../models/reviewDecisions.db.queries';
import { UserInterviewAccesses } from '../logging/loggingTypes';
import { SurveyObjectsAndAuditsFactory } from '../audits/SurveyObjectsAndAuditsFactory';
import { AuditLog } from '../audits/auditLog';
import { AuditStatsByLevelAndObjectType } from 'evolution-common/lib/services/audits/types';
import {
    InterviewAttributes,
    InterviewListAttributes,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { getParadataLoggingFunction } from '../logging/paradataLogging';
import projectConfig from 'evolution-common/lib/config/project.config';
import { type InterviewListStatusFilter } from 'evolution-common/lib/services/reviews/types';
import { randomOrderQuestionsResponsePath } from 'evolution-common/lib/services/questionnaire/randomOrderQuestions';
import { generateRandomOrderQuestions } from './generateRandomOrderQuestions';

export type FilterType = string | string[] | ValueFilterType;

const getFiltersForDb = (
    filter: { review_status?: InterviewListStatusFilter } & {
        [key: string]: FilterType;
    }
): {
    [key: string]: ValueFilterType;
} => {
    const { review_status, ...filters } = filter;

    const actualFilters: {
        [key: string]: ValueFilterType;
    } = {};

    // `questionable` is offered by the same dropdown as the review statuses, but it is a
    // column of the interview rather than something the reviewers decided.
    if (review_status === 'questionable') {
        actualFilters.is_questionable = { value: true, op: 'eq' };
    } else if (review_status !== undefined && review_status !== 'all') {
        actualFilters.review_status = { value: review_status };
    }

    Object.keys(filters).forEach((key) => {
        const filter = filters[key];
        if (typeof filter === 'string' || Array.isArray(filter)) {
            actualFilters[key] = { value: filter };
        } else {
            actualFilters[key] = filter;
        }
    });

    return actualFilters;
};

export default class Interviews {
    // TODO The actual location of the access code may depend on the questionnaire. It should not be hard-coded here, but passed by the actual application.
    static findByAccessCode = async (accessCode: string): Promise<InterviewSearchAttributes[]> => {
        if (!validateAccessCode(accessCode)) {
            return [];
        }
        // Search the canonical form so accepted input variants (no dash, spaces, lower case) match the stored value
        return await interviewsDbQueries.findByResponse({ accessCode: normalizeAccessCode(accessCode) });
    };

    static getInterviewByUuid = async (interviewId: string): Promise<InterviewAttributes | undefined> => {
        if (!validateUuid(interviewId)) {
            return undefined;
        }
        return await interviewsDbQueries.getInterviewByUuid(interviewId);
    };

    static getUserInterview = async (userId: number): Promise<UserInterviewAttributes | undefined> => {
        return await interviewsDbQueries.getUserInterview(userId);
    };

    static createInterviewForUser = async (
        participantId: number,
        initialResponse: { [key: string]: any },
        creatingUserId?: number | undefined,
        returning: string | string[] = 'uuid'
    ): Promise<InterviewAttributes> => {
        // TODO Make sure there is no active interview for this user already?
        // Create the interview for this user, make sure the start time is set
        const response = _cloneDeep(initialResponse);
        if (response._startedAt === undefined) {
            response._startedAt = moment().unix();
        }
        // Draw the random order of the configured question groups once at
        // creation, so the frontend applies the same order throughout the
        // interview (sections and grouped objects). A project may have set its
        // own order in the initial response, then it is kept as is.
        if (_isBlank(response[randomOrderQuestionsResponsePath])) {
            const randomOrderQuestions = generateRandomOrderQuestions(projectConfig.randomOrderQuestions ?? {});
            if (Object.keys(randomOrderQuestions).length > 0) {
                response[randomOrderQuestionsResponsePath] = randomOrderQuestions;
            }
        }
        const interview = await interviewsDbQueries.create(
            { participant_id: participantId, response, is_active: true, validations: {} },
            returning
        );
        if (!interview.uuid || Object.keys(initialResponse).length === 0) {
            return interview as InterviewAttributes;
        }
        // update interview with initial response so that server updates are run on the initial response
        const userInterview = await Interviews.getInterviewByUuid(interview.uuid);
        if (userInterview === undefined) {
            throw 'Interview just created was not found!';
        }
        const valuesByPath = {};
        // The random order was already saved with the created interview, don't
        // overwrite it with a blank initial value
        Object.keys(initialResponse)
            .filter((key) => key !== randomOrderQuestionsResponsePath)
            .forEach((key) => {
                valuesByPath[`response.${key}`] = initialResponse[key];
            });
        await updateInterview(userInterview, {
            logUpdate: getParadataLoggingFunction({ interviewId: userInterview.id, userId: creatingUserId }),
            valuesByPath,
            fieldsToUpdate: ['response']
        });
        return interview as InterviewAttributes;
    };

    // TODO Add filters fields as required
    static getAllMatching = async (
        params: {
            filter?: { review_status?: InterviewListStatusFilter } & {
                [key: string]: FilterType;
            };
            pageIndex?: number;
            pageSize?: number;
            updatedAt?: number;
            sort?: (string | { field: string; order: 'asc' | 'desc' })[];
        } = {}
    ): Promise<{
        interviews: InterviewListAttributes[];
        totalCount: number;
    }> => {
        const pageIndex = params.pageIndex || 0;
        const pageSize = params.pageSize || -1;
        const updatedAt = params.updatedAt || 0;

        const actualFilters = getFiltersForDb(params.filter || {});
        // Add the updated at query if the time is larger than 0
        if (updatedAt > 0) {
            actualFilters.updated_at = { value: updatedAt, op: 'gte' };
        }

        return await interviewsDbQueries.getList({ filters: actualFilters, pageIndex, pageSize, sort: params.sort });
    };

    static getValidationAuditStats = async (
        params: {
            filter?: { review_status?: InterviewListStatusFilter } & {
                [key: string]:
                    | string
                    | string[]
                    | { value: string | string[] | boolean | number | null; op?: keyof OperatorSigns };
            };
        } = {}
    ): Promise<{ auditStats: AuditStatsByLevelAndObjectType }> => {
        const actualFilters = getFiltersForDb(params.filter || {});

        return interviewsDbQueries.getValidationAuditStats({ filters: actualFilters });
    };

    static async auditInterviews(disableConsoleLog = false, runExtendedAuditChecks = false): Promise<void> {
        const oldConsoleLog = console.log;
        if (disableConsoleLog) {
            console.log = () => {
                return;
            };
            console.info = oldConsoleLog;
        }
        let i = 1;
        const queryStream = interviewsDbQueries.getInterviewsStream({ filters: {} });
        return new Promise((resolve, reject) => {
            queryStream
                .on('error', (error) => {
                    AuditLog.error('queryStream failed', error);
                    if (disableConsoleLog) {
                        console.log = oldConsoleLog;
                    }
                    reject(error);
                })
                .on('data', (row) => {
                    queryStream.pause();
                    const interview = row;
                    if (i % 1000 === 0 || i === 1) {
                        AuditLog.info(`Auditing interview ${i}`);
                    }
                    i++;
                    if (_isBlank(interview.corrected_response)) {
                        copyResponseToCorrectedResponse(interview)
                            .then(
                                () =>
                                    new Promise((res1, _rej1) => {
                                        SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(
                                            interview,
                                            runExtendedAuditChecks
                                        )
                                            .then(() => {
                                                res1(true);
                                            })
                                            .catch((error) => {
                                                AuditLog.error('Error running and saving interview audits', error);
                                                res1(false);
                                            });
                                    })
                            )
                            .catch((error) => {
                                AuditLog.error('Error copying response to corrected response', error);
                            })
                            .finally(() => {
                                queryStream.resume();
                            });
                    } else {
                        SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(
                            interview,
                            runExtendedAuditChecks
                        )
                            .catch((error) => {
                                AuditLog.error('Error running and saving interview audits', error);
                            })
                            .finally(() => {
                                queryStream.resume();
                            });
                    }
                })
                .on('end', () => {
                    AuditLog.info('all interviews audited successfully.');
                    if (disableConsoleLog) {
                        console.log = oldConsoleLog;
                    }
                    resolve();
                });
        });
    }

    static async resetInterviews(confirm: string): Promise<void> {
        if (confirm !== 'I WANT TO DELETE ALL VALIDATION WORK') {
            return new Promise((_resolve, reject) => {
                reject('The confirm string should be \'I WANT TO DELETE ALL VALIDATION WORK\'');
            });
        }
        const queryStream = interviewsDbQueries.getInterviewsStream({ filters: {} });
        let i = 0;
        return new Promise((resolve, reject) => {
            queryStream
                .on('error', (error) => {
                    console.error('queryStream failed', error);
                    reject(error);
                })
                .on('data', (row) => {
                    queryStream.pause();
                    // Pausing the connnection is useful if your processing involves I/O
                    const interview = row;
                    // The review decisions hold the validation work, so they are deleted along
                    // with the deprecated is_valid/is_validated flags. Both writes destroy what
                    // they touch, and no transaction spans them, as `updateInterview` takes
                    // none: a failure in between leaves an interview with its flags reset and
                    // its decisions still there. Running the task again completes it, both
                    // writes being idempotent.
                    updateInterview(interview, {
                        fieldsToUpdate: ['corrected_response', 'is_completed', 'is_validated', 'is_valid'],
                        valuesByPath: {
                            corrected_response: interview.response,
                            is_completed: null,
                            is_validated: null,
                            is_valid: null
                        }
                    })
                        .then(() => reviewDecisionsDbQueries.deleteReviewDecisionsForInterview(interview.id))
                        .then(() => {
                            queryStream.resume();
                        })
                        .catch((error) => {
                            console.error(error);
                            queryStream.end();
                            reject(error);
                        });
                    console.log(i + 1, interview.uuid);
                    i++;
                })
                .on('end', () => {
                    console.log('all interviews reset successfully');
                    resolve();
                });
        });
    }

    static statEditingUsers = async (
        params: { permissions?: string[] } = {}
    ): Promise<(UserInterviewAccesses & { email: string })[]> => {
        return await interviewsAccessesDbQueries.statEditingUsers(params);
    };
}
