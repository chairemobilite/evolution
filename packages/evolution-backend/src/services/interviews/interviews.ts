/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import moment from 'moment';
import { auditInterview, getChangesAfterCleaningInterview } from 'evolution-common/lib/services/interviews/interview';
import { updateInterview, setInterviewFields, copyResponsesToValidatedData } from './interview';
import { mapResponsesToValidatedData } from './interviewUtils';
import { validateAccessCode } from '../accessCode';
import { validate as validateUuid } from 'uuid';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import interviewsDbQueries, {
    InterviewSearchAttributes,
    OperatorSigns,
    ValueFilterType
} from '../../models/interviews.db.queries';
import interviewsAccessesDbQueries from '../../models/interviewsAccesses.db.queries';
import { UserInterviewAccesses } from '../logging/loggingTypes';
import { Audits } from '../../services/audits/Audits';
import { AuditsByLevelAndObjectType } from 'evolution-common/lib/services/audits/types';
import {
    InterviewAttributes,
    InterviewListAttributes,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';

export type FilterType = string | string[] | ValueFilterType;

const getFiltersForDb = (
    filter: { is_valid?: 'valid' | 'invalid' | 'notInvalid' | 'notValidated' | 'questionable' | 'all' } & {
        [key: string]: FilterType;
    }
): {
    [key: string]: ValueFilterType;
} => {
    const { is_valid, ...filters } = filter;

    const actualFilters: {
        [key: string]: ValueFilterType;
    } = {};

    // Add the desired validity query
    switch (is_valid) {
    case 'valid':
        actualFilters.is_valid = { value: true, op: 'eq' };
        break;
    case 'invalid':
        actualFilters.is_valid = { value: false, op: 'eq' };
        break;
    case 'notInvalid':
        actualFilters.is_valid = { value: false, op: 'not' };
        break;
    case 'notValidated':
        actualFilters.is_valid = { value: null, op: 'eq' };
        break;
    case 'questionable':
        actualFilters.is_questionable = { value: true, op: 'eq' };
        break;
    default:
        // No filter required
        break;
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
        return await interviewsDbQueries.findByResponse({ accessCode });
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
        initialResponses: { [key: string]: any },
        returning: string | string[] = 'uuid'
    ): Promise<Partial<InterviewAttributes>> => {
        // TODO Make sure there is no active interview for this user already?

        // Create the interview for this user, make sure the start time is set
        const responses = _cloneDeep(initialResponses);
        if (responses._startedAt === undefined) {
            responses._startedAt = moment().unix();
        }
        const interview = await interviewsDbQueries.create(
            { participant_id: participantId, responses, is_active: true, validations: {}, logs: [] },
            returning
        );
        if (!interview.uuid || Object.keys(initialResponses).length === 0) {
            return interview as InterviewAttributes;
        }
        // update interview with initial responses so that server updates are run on the initial responses
        const userInterview = await Interviews.getInterviewByUuid(interview.uuid);
        if (userInterview === undefined) {
            throw 'Interview just created was not found!';
        }
        const valuesByPath = {};
        Object.keys(initialResponses).forEach((key) => {
            valuesByPath[`responses.${key}`] = initialResponses[key];
        });
        await updateInterview(userInterview, {
            valuesByPath,
            fieldsToUpdate: ['responses']
        });
        return interview as InterviewAttributes;
    };

    // TODO Add filters fields as required
    static getAllMatching = async (
        params: {
            filter?: { is_valid?: 'valid' | 'invalid' | 'notInvalid' | 'notValidated' | 'all' } & {
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
            filter?: { is_valid?: 'valid' | 'invalid' | 'notInvalid' | 'notValidated' | 'all' } & {
                [key: string]:
                    | string
                    | string[]
                    | { value: string | string[] | boolean | number | null; op?: keyof OperatorSigns };
            };
        } = {}
    ): Promise<{ auditStats: AuditsByLevelAndObjectType }> => {
        const actualFilters = getFiltersForDb(params.filter || {});

        return interviewsDbQueries.getValidationAuditStats({ filters: actualFilters });
    };

    static async auditInterviewsV2(disableConsoleLog = false): Promise<void> {
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
                    console.error('queryStream failed', error);
                    if (disableConsoleLog) {
                        console.log = oldConsoleLog;
                    }
                    reject(error);
                })
                .on('data', (row) => {
                    queryStream.pause();
                    const interview = row;
                    if (i % 1000 === 0 || i === 1) {
                        console.info(`Auditing interview ${i}`);
                    }
                    i++;
                    if (_isBlank(interview.validated_data)) {
                        copyResponsesToValidatedData(interview)
                            .then(
                                () =>
                                    new Promise((res1, _rej1) => {
                                        Audits.runAndSaveInterviewAudits(interview)
                                            .then(() => {
                                                res1(true);
                                            })
                                            .catch((error) => {
                                                console.error('Error running and saving interview audits', error);
                                                res1(false);
                                            });
                                    })
                            )
                            .catch((error) => {
                                console.error('Error copying responses to validated data', error);
                            })
                            .finally(() => {
                                queryStream.resume();
                            });
                    } else {
                        Audits.runAndSaveInterviewAudits(interview)
                            .catch((error) => {
                                console.error('Error running and saving interview audits', error);
                            })
                            .finally(() => {
                                queryStream.resume();
                            });
                    }
                })
                .on('end', () => {
                    console.log('all interviews audited successfully.');
                    if (disableConsoleLog) {
                        console.log = oldConsoleLog;
                    }
                    resolve();
                });
        });
    }

    static async auditInterviews(validations, surveyProjectHelper, parsers): Promise<void> {
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
                    const changesAfterCleaningInterview = mapResponsesToValidatedData(
                        getChangesAfterCleaningInterview(
                            interview.validated_data,
                            interview.responses,
                            interview,
                            parsers,
                            surveyProjectHelper
                        ),
                        []
                    );
                    setInterviewFields(interview, changesAfterCleaningInterview);
                    const audits = auditInterview(
                        interview.validated_data,
                        interview.responses,
                        interview,
                        validations,
                        surveyProjectHelper
                    );
                    changesAfterCleaningInterview.valuesByPath.audits = audits;
                    updateInterview(interview, {
                        fieldsToUpdate: ['audits'],
                        logDatabaseUpdates: false,
                        valuesByPath: changesAfterCleaningInterview.valuesByPath
                    })
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
                    console.log('all interviews audited successfully');
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
                    updateInterview(interview, {
                        fieldsToUpdate: ['validated_data', 'is_completed', 'is_validated', 'is_valid'],
                        logDatabaseUpdates: false,
                        valuesByPath: {
                            validated_data: interview.responses,
                            is_completed: null,
                            is_validated: null,
                            is_valid: null
                        }
                    })
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
