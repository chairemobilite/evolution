/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { INTERVIEWER_PARTICIPANT_PREFIX } from 'evolution-common/lib/services/interviews/interview';
import { _booleish, _removeBlankFields } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { AuditsByLevelAndObjectType } from 'evolution-common/lib/services/audits/types';
import { isFeature, isPolygon } from 'geojson-validation';
import knexPostgis from 'knex-postgis';
import { QueryBuilder } from 'knex';
import {
    InterviewAttributes,
    InterviewListAttributes,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';

const st = knexPostgis(knex);

const tableName = 'sv_interviews';
const participantTable = 'sv_participants';
const surveyTable = 'sv_surveys';
const accessTable = 'sv_interviews_accesses';

let _surveyId: number | undefined = undefined;

export interface InterviewSearchAttributes {
    id: number;
    uuid: string;
    home: { [key: string]: any };
    isCompleted?: boolean;
    isValid?: boolean;
    email?: string | undefined;
    username?: string | undefined;
    facebook: boolean;
    google: boolean;
    surveyId?: number;
}

export type ValueFilterType = {
    value: string | string[] | boolean | number | null | GeoJSON.Feature<GeoJSON.Polygon>;
    op?: keyof OperatorSigns;
};

/** this will return the survey id or create a new survey in
 * table sv_surveys if no existing survey shortname matches
 * the project shortname
 * TODO: this should be run during server startup preparation
 * so it is always available here and can be used from config
 */
const getSurveyId = async (): Promise<number> => {
    // Here we repeat check for _surveyId multiple time to make
    // sure another thread didn't create it in the meantime:
    if (_surveyId) {
        return _surveyId;
    }

    // check in survey table if at least one matches the project shortname:
    const matchingSurvey = await knex.select('*').from(surveyTable).where('shortname', config.projectShortname);

    if (matchingSurvey.length === 1) {
        return matchingSurvey[0].id;
    }

    // no match: create a new survey using upsert (onConflict) for race conditions:
    if (!_surveyId) {
        await knex(surveyTable)
            .insert({
                shortname: config.projectShortname
            })
            .onConflict('shortname')
            .ignore();
        const newSurvey = await knex.select('*').from(surveyTable).where('shortname', config.projectShortname);
        if (!_surveyId && newSurvey && newSurvey[0] && newSurvey[0].id) {
            _surveyId = newSurvey[0].id;
        }
    }

    if (!_surveyId) {
        throw 'Cannot generate survey to assign to the interviews. There may be a race condtion trying to create the survey in another thread.';
    }
    return _surveyId;
};

const findByResponse = async (searchObject: { [key: string]: any }): Promise<InterviewSearchAttributes[]> => {
    try {
        const surveyId = await getSurveyId();
        const interviewsQuery = knex
            .select(
                'i.id',
                'i.uuid',
                knex.raw('responses->\'home\' as home'),
                'i.is_completed',
                'i.is_questionable',
                'i.is_valid',
                'i.survey_id',
                'participant.email',
                'participant.username',
                knex.raw('case when participant.facebook_id is null then false else true end facebook'),
                knex.raw('case when participant.google_id is null then false else true end google')
            )
            .from(`${tableName} as i`)
            .join(`${participantTable} as participant`, 'i.participant_id', 'participant.id');
        // Create the where query
        const whereRawString: string[] = [`survey_id = ${surveyId}`];
        const bindings: string[] = [];
        const whereBuilder = (prefix: string, object: { [key: string]: any }) => {
            Object.keys(object).forEach((key) => {
                if (typeof object[key] === 'object') {
                    whereBuilder(prefix + `->'${key}'`, object[key]);
                } else {
                    whereRawString.push(prefix + `->>'${key}' = ?`);
                    bindings.push(object[key]);
                }
            });
        };
        whereBuilder('"i"."responses"', searchObject);
        if (whereRawString.length === 0) {
            console.log('No search specified, nothing will be returned');
            return [];
        }
        const interviews = await interviewsQuery.whereRaw(whereRawString.join(' AND '), bindings);
        return interviews.map((interview) => ({
            id: interview.id,
            uuid: interview.uuid,
            home: interview.home === null ? {} : interview.home,
            isCompleted: interview.is_completed === null ? undefined : interview.is_completed,
            isQuestionable: interview.is_questionable,
            isValid: interview.is_valid === null ? undefined : interview.is_valid,
            email: interview.email === null ? undefined : interview.email,
            username: interview.username === null ? undefined : interview.username,
            facebook: interview.facebook,
            google: interview.google,
            surveyId: interview.survey_id
        }));
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot find interviews by responses because of a database error (knex error: ${error})`,
            'TITQGC0002'
        );
    }
};

const getInterviewByUuid = async (interviewUuid: string): Promise<InterviewAttributes | undefined> => {
    try {
        // TODO We probably shouldn't just return all fields. Figure out how to
        // specify which fields, it will depend on the calling context. Maybe an
        // array of strings keyof InterviewAttributes which will map to sql
        // fields
        const interviews = await knex.select('i.*').from(`${tableName} as i`).andWhere('uuid', interviewUuid);
        if (interviews.length !== 1) {
            return undefined;
        }
        return _removeBlankFields(interviews[0]) as InterviewAttributes;
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot find interviews by uuid because of a database error (knex error: ${error})`,
            'TITQGC0002'
        );
    }
};

const getInterviewIdByUuid = async (interviewUuid: string): Promise<number | undefined> => {
    try {
        const interviews = await knex.select('id').from(tableName).andWhere('uuid', interviewUuid);
        return interviews.length === 1 ? interviews[0].id : undefined;
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot find interview id by uuid because of a database error (knex error: ${error})`,
            'TITQGC0022'
        );
    }
};

const getUserInterview = async (participantId: number): Promise<UserInterviewAttributes | undefined> => {
    try {
        const surveyId = await getSurveyId();
        const interviews = await knex
            .select(
                'sv_interviews.id',
                'sv_interviews.uuid',
                'responses',
                'validations',
                'participant_id',
                'is_valid',
                'is_completed',
                'is_questionable',
                'sv_interviews.survey_id'
            )
            .from('sv_interviews')
            .whereRaw('sv_interviews.is_active IS TRUE')
            .andWhere('sv_interviews.survey_id', surveyId)
            .andWhere('sv_interviews.participant_id', participantId);
        if (interviews.length === 0) {
            return undefined;
        } else if (interviews.length > 1) {
            console.warn(`There are more than one active interview for user ${participantId}`);
        }
        return _removeBlankFields(interviews[0]) as UserInterviewAttributes;
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot find interviews for user because of a database error (knex error: ${error})`,
            'TITQGC0003'
        );
    }
};

/**
 * Arrays cannot be inserted as is, otherwise they throw an error, so logs need
 * to be converted to string. Also null unicode character \u0000 is not valid in a
 * json string, replace with a space
 * @param object
 * @returns An object with the json data sanitized
 */
const sanitizeJsonData = (object: Partial<InterviewAttributes>) => {
    const { logs, responses, validated_data, ...rest } = object;
    const newResponses = responses !== undefined ? JSON.stringify(responses).replaceAll('\\u0000', '') : undefined;
    const newLogs = logs !== undefined ? JSON.stringify(logs).replaceAll('\\u0000', '') : undefined;
    const newValidatedData =
        validated_data !== undefined ? JSON.stringify(validated_data).replaceAll('\\u0000', '') : undefined;
    return {
        ...rest,
        responses: newResponses,
        logs: newLogs,
        validated_data: newValidatedData
    };
};

const create = async (
    newObject: Partial<InterviewAttributes>,
    returning: string | string[] = 'id'
): Promise<Partial<InterviewAttributes>> => {
    try {
        const surveyId = await getSurveyId();
        newObject.survey_id = surveyId;
        const returningArray = await knex(tableName).insert(sanitizeJsonData(newObject)).returning(returning);
        if (returningArray.length === 1) {
            return returningArray[0];
        }
        throw 'Error creating interview, not the expected returned size';
    } catch (error) {
        throw new TrError(
            `Cannot insert object in table ${tableName} database (knex error: ${error})`,
            'DBQCR0001',
            'DatabaseCannotCreateBecauseDatabaseError'
        );
    }
};

const update = async (
    uuid: string,
    updatedInterview: Partial<InterviewAttributes>,
    returning: string | string[] = 'uuid'
): Promise<Partial<InterviewAttributes>> => {
    try {
        const returningArray = await knex(tableName)
            .update(sanitizeJsonData(updatedInterview))
            .where('uuid', uuid)
            .returning(returning);
        if (returningArray.length === 1) {
            return returningArray[0];
        }
        throw 'Error updating interview, not the expected returned size';
    } catch (error) {
        throw new TrError(
            `Cannot update object in table ${tableName} database (knex error: ${error})`,
            'DBQCR0002',
            'DatabaseCannotUpdateBecauseDatabaseError'
        );
    }
};

export type OperatorSigns = {
    eq: string;
    gt: string;
    lt: string;
    gte: string;
    lte: string;
    not: string;
    like: string;
};
const operatorSigns = {
    eq: '=',
    gt: '>',
    lt: '<',
    gte: '>=',
    lte: '<=',
    not: '!=',
    like: 'like'
};

// Even if it is typed, in reality, this data comes from the universe and can be anything. Make sure we don't inject sql
const sanitizeOrderDirection = (order: string): string => {
    if (order.toLowerCase() === 'asc') {
        return 'asc';
    } else if (order.toLowerCase() === 'desc') {
        return 'desc';
    } else {
        throw new TrError(`Invalid sort order for interview query: ${order}`, 'DBINTO0001', 'InvalidSortOrder');
    }
};

/**
 * Add order by clause to the query
 *
 * TODO: Properly type the knexQuery object, there seems to be a type mismatch
 * if just putting import Knex from 'knex' and Knex.Builder here and the type
 * from chaire-lib/.../db.config
 *
 * @param knexQuery
 * @param sortField Either the field to sort by, or an object with the field and
 * sort order
 * @param tblAlias
 * @returns
 */
const addOrderByClause = (
    knexQuery: any,
    sortField: string | { field: string; order: 'asc' | 'desc' },
    tblAlias: string
) => {
    // Default sort order is ascending if it is not specified
    // TODO Try to remove the string and take only the object with optional sort order
    const order = typeof sortField === 'string' ? 'asc' : sanitizeOrderDirection(sortField.order);
    const field = typeof sortField === 'string' ? sortField : sortField.field;
    const jsonObject = field.split('.');
    if (jsonObject.length > 1) {
        // this means it is a nested json field and we must convert dots to arrow (->>, ->)
        const lastAttribute = jsonObject.pop();
        const firstAttribute = jsonObject.shift();
        knexQuery.orderBy(
            knex.raw(`"${firstAttribute}"->${jsonObject.map((attribute) => `'${attribute}'->`)}>'${lastAttribute}'`),
            order
        );
        return;
    }
    if (jsonObject.length === 1) {
        knexQuery.orderBy(field, order);
        return;
    }
    // TODO only responses field order by is supported
    const prefix = jsonObject[0] === 'responses' ? `${tblAlias}.responses` : undefined;
    if (prefix !== undefined) {
        const field = jsonObject.slice(1).join('.');
        // Order by without raw does not work for object accessed fields
        knexQuery.orderByRaw(`${prefix}->>'${field}' ${order}`);
    }
};

const addLikeBinding = (operator: keyof OperatorSigns | undefined, binding: string | boolean | number) =>
    operator === 'like' && typeof binding === 'string' ? `%${binding}%` : binding;

/**
 * Create a raw where clause from a filter
 *
 * @returns Either a string with the raw where clause, an array where the first
 * element is the raw where clause and the second is the value to bind with they
 * query, or undefined if the field is unknown
 */
const getRawWhereClause = (
    field: string,
    filter: ValueFilterType,
    tblAlias: string
): (string | [string, string | boolean | number] | undefined)[] => {
    // Make sure the field is a legitimate field to avoid sql injection. Field
    // is either the name of a field, or a dot-separated path in a json object
    // of the 'responses' field. We should not accept anything else.
    // TODO Once the individual surveys are typed and the expected
    // responses are known in advance, try to completely type the responses
    // object and make sure the field here matches an actual path
    const dotSeparatedStringRegex = /^[\w.]*$/g;
    const match = field.match(dotSeparatedStringRegex);
    if (match === null) {
        throw new TrError(
            `Invalid field for where clause in ${tableName} database`,
            'DBQCR0005',
            'DatabaseInvalidWhereClauseUserEntry'
        );
    }
    const getBooleanFilter = (fieldName: string, filter: ValueFilterType) => {
        const validityValue = _booleish(filter.value);
        const notStr = filter.op === 'not' ? ' NOT ' : '';
        if (validityValue !== null) {
            return [`${fieldName} IS ${notStr} ${validityValue ? 'TRUE' : 'FALSE'} `];
        }
        return [`${fieldName} IS ${notStr} null`];
    };
    switch (field) {
    // For created_at and updated_at, we also accept a date range as an array two unix timestamps.
    // Note that dates in the database are saved with time zones.
    // In such a case, the filter operation parmeter is ignored (>= and <= are used).
    case 'created_at':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
            return [
                `${tblAlias}.created_at >= to_timestamp(${filter.value[0]}) AND ${tblAlias}.created_at <= to_timestamp(${filter.value[1]}) `
            ];
        } else {
            return [
                `${tblAlias}.created_at ${filter.op ? operatorSigns[filter.op] : operatorSigns.eq} to_timestamp(${
                    filter.value
                }) `
            ];
        }
    case 'updated_at':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
            return [
                `${tblAlias}.updated_at >= to_timestamp(${filter.value[0]}) AND ${tblAlias}.updated_at <= to_timestamp(${filter.value[1]}) `
            ];
        } else {
            return [
                `${tblAlias}.updated_at ${filter.op ? operatorSigns[filter.op] : operatorSigns.eq} to_timestamp(${
                    filter.value
                }) `
            ];
        }
    case 'is_valid':
        return getBooleanFilter(`${tblAlias}.is_valid`, filter);
    case 'is_questionable':
        return getBooleanFilter(`${tblAlias}.is_questionable`, filter);
    case 'uuid':
        return [
            `${tblAlias}.${field} ${filter.op ? operatorSigns[filter.op] : operatorSigns.eq} '${filter.value}'`
        ];
    case 'audits': {
        if (typeof filter.value !== 'string' && !Array.isArray(filter.value)) {
            return [undefined];
        }
        const values = typeof filter.value === 'string' ? [filter.value] : filter.value;
        const matches = values.map((value) => value.match(dotSeparatedStringRegex));
        if (matches.find((m) => m === null) !== undefined) {
            throw new TrError(
                `Invalid value for where clause in ${tableName} database`,
                'DBQCR0006',
                'DatabaseInvalidWhereClauseUserEntry'
            );
        }
        // Add subquery to audits table
        return values.map((value) => [
            `${tblAlias}.id in (${
                knex('sv_audits').select('interview_id').distinct().where('error_code', value).toSQL().sql
            })`,
            value
        ]);
    }
    }
    const jsonObject = field.split('.');
    // TODO only responses field order by is supported
    const prefix = jsonObject[0] === 'responses' ? `${tblAlias}.responses` : undefined;
    if (prefix !== undefined) {
        const field = jsonObject.slice(1).join('\'->\'');
        if (isFeature(filter.value) && isPolygon((filter.value as GeoJSON.Feature).geometry)) {
            return [
                `${prefix}->'${field}' is not null AND ST_CONTAINS(${st.geomFromGeoJSON(JSON.stringify((filter.value as GeoJSON.Feature<GeoJSON.Polygon>).geometry))}, ST_GeomFromGeoJSON(${prefix}->'${field}'->'geometry'))`
            ];
        }
        return filter.value === null
            ? [`${prefix}->>'${field}' ${filter.op === 'not' ? ' IS NOT NULL' : ' IS NULL'}`]
            : Array.isArray(filter.value)
                ? filter.value.map((value) => [
                    `${prefix}->>'${field}' ${
                        filter.op !== undefined
                            ? `${operatorSigns[filter.op] || operatorSigns.eq} ?`
                            : `${operatorSigns.eq} ?`
                    }`,
                    addLikeBinding(filter.op, value)
                ])
                : [
                    [
                        `${prefix}->>'${field}' ${
                            filter.op !== undefined
                                ? `${operatorSigns[filter.op] || operatorSigns.eq} ?`
                                : `${operatorSigns.eq} ?`
                        }`,
                        addLikeBinding(filter.op, filter.value as string | number | boolean)
                    ]
                ];
    }
    return [undefined];
};

/**
 * Append the user-requested filters to the base raw where clause. Since those
 * clauses may involve path in a json object, it is not possible to use knex's
 * simple where clauses, so we add raw queries. But we use bindings for the
 * values instead of appending them directly to make sure they are properly
 * escaped.
 *
 * @param filters The filter received by the user.
 * @param baseFilter The base raw query
 * @returns An array where the first element is the complete raw where clause
 * and the second element is the array of bindings
 */
const updateRawWhereClause = (
    filters: { [key: string]: ValueFilterType },
    baseFilter: string
): [string, (string | boolean | number)[]] => {
    let rawFilter = baseFilter;
    const bindings: (string | number | boolean)[] = [];
    Object.keys(filters).forEach((key) => {
        const whereClauses = getRawWhereClause(key, filters[key], 'i');
        whereClauses.forEach((whereClause) => {
            if (typeof whereClause === 'string') {
                rawFilter += ` AND ${whereClause}`;
            } else if (Array.isArray(whereClause)) {
                rawFilter += ` AND ${whereClause[0]}`;
                bindings.push(whereClause[1]);
            }
        });
    });
    return [rawFilter, bindings];
};

/**
 * Get a paginated list of interviews, for validation or admin purposes, with
 * possible filters
 *
 * @param {({ filters: { [key: string]: { value: string | boolean | number, op:
 * keyof OperatorSigns } }; pageIndex: number; pageSize: number })} params
 * pageIndex is the index of the page to get, for the given filter. The first
 * one has index 0. pageSize is the maximum of entries in a page. To get the
 * entire list, use a value of -1
 * @return {*}  {Promise<{ interviews: InterviewAttributes[]; totalCount: number
 * }>} Return the page of interviews and the total number of interviews
 * corresponding to the query
 */
const getList = async (params: {
    filters: { [key: string]: ValueFilterType };
    pageIndex: number;
    pageSize: number;
    sort?: (string | { field: string; order: 'asc' | 'desc' })[];
}): Promise<{
    interviews: InterviewListAttributes[];
    totalCount: number;
}> => {
    try {
        const baseRawFilter =
            'i.is_active IS TRUE AND participant.is_valid IS TRUE AND participant.is_test IS NOT TRUE';
        const [rawFilter, bindings] = updateRawWhereClause(params.filters, baseRawFilter);
        // Get the total count for that query and filter
        const countResult = await knex
            .count('i.id')
            .from(`${tableName} as i`)
            .leftJoin(`${participantTable} as participant`, 'i.participant_id', 'participant.id')
            .whereRaw(rawFilter, bindings);

        const totalCount: number =
            countResult.length === 1
                ? typeof countResult[0].count === 'string'
                    ? parseInt(countResult[0].count)
                    : countResult[0].count
                : 0;

        if (totalCount === 0) {
            return { interviews: [], totalCount };
        }

        const sortFields = params.sort || [];
        let hasSortByField = false;

        const auditsCountQuery = knex('sv_audits')
            .select('interview_id', 'error_code')
            .count()
            .groupBy('interview_id', 'error_code')
            .orderBy('count')
            .as('audits_cnt');
        const auditsQuery = knex(auditsCountQuery)
            .select('interview_id', knex.raw('json_agg(json_build_object(error_code, count)) as audits'))
            .groupBy('interview_id')
            .as('audits');
        const interviewsQuery = knex
            .select(
                'i.id',
                'i.uuid',
                'i.updated_at',
                'i.created_at',
                'i.responses',
                'i.validated_data',
                'audits.audits',
                'i.is_valid',
                'i.is_completed',
                'i.is_validated',
                'i.is_questionable',
                'i.survey_id',
                'participant.username',
                knex.raw('case when participant.facebook_id is null then false else true end facebook'),
                knex.raw('case when participant.google_id is null then false else true end google')
            )
            .from(`${tableName} as i`)
            .leftJoin(`${participantTable} as participant`, 'i.participant_id', 'participant.id')
            .leftJoin(auditsQuery, 'i.id', 'audits.interview_id')
            .whereRaw(rawFilter, bindings);
        // Add sort fields
        sortFields.forEach((field) => {
            hasSortByField = true;
            addOrderByClause(interviewsQuery, field, 'i');
        });
        if (!hasSortByField) {
            // sort by id by default if no other sort is specified.
            interviewsQuery.orderBy('i.id');
        }
        // Add pagination
        if (params.pageSize > 0) {
            interviewsQuery.limit(params.pageSize).offset(params.pageIndex * params.pageSize);
        }
        const interviews = await interviewsQuery;

        // TODO For backward compatibility, the type of the audits is an object with key => count. When we only use the new audits, this can be udpated
        const auditsToObject = ({ audits, ...rest }) => {
            const newAudits =
                audits === undefined
                    ? undefined
                    : (audits as { [auditKey: string]: number }[]).reduce(
                        (accumulator, currentValue) => ({ ...accumulator, ...currentValue }),
                        {}
                    );
            return {
                ...rest,
                audits: newAudits
            } as InterviewListAttributes;
        };
        return { interviews: interviews.map((interview) => auditsToObject(_removeBlankFields(interview))), totalCount };
    } catch (error) {
        throw new TrError(
            `Cannot get interview list in table ${tableName} database (knex error: ${error})`,
            'DBQCR0003',
            'DatabaseCannotListBecauseDatabaseError'
        );
    }
};

/**
 * Get a list of all validations errors on interviews corresponding to the
 * filter
 *
 * @param {({ filters: { [key: string]: { value: string | boolean | number, op:
 * keyof OperatorSigns } }; })} params
 * @return {*}  {Promise<{ errors: { key: string; cnt: string }[] }>} Return the
 * list of errors with the error code and the total number of errors in
 * interviews
 */
const getValidationAuditStats = async (params: {
    filters: { [key: string]: ValueFilterType };
}): Promise<{ auditStats: AuditsByLevelAndObjectType }> => {
    try {
        const baseRawFilter =
            'i.is_active IS TRUE AND participant.is_valid IS TRUE AND participant.is_test IS NOT TRUE';
        const [rawFilter, bindings] = updateRawWhereClause(params.filters, baseRawFilter);
        const validationAuditStatsQuery = knex
            .select('error_code as key', knex.raw('count(error_code) cnt'), 'level', 'object_type')
            .from(`${tableName} as i`)
            .innerJoin('sv_audits', 'id', 'interview_id')
            .leftJoin(`${participantTable} as participant`, 'i.participant_id', 'participant.id')
            .whereRaw(rawFilter, bindings)
            .groupBy('error_code', 'level', 'object_type')
            .orderBy('cnt', 'desc');

        const audits = await validationAuditStatsQuery;

        const auditStats: AuditsByLevelAndObjectType = {};
        audits.forEach((audit) => {
            if (!auditStats[audit.level]) {
                auditStats[audit.level] = {};
            }
            if (!auditStats[audit.level][audit.object_type]) {
                auditStats[audit.level][audit.object_type] = [];
            }
            auditStats[audit.level][audit.object_type].push({ cnt: audit.cnt, key: audit.key });
        });

        return { auditStats };
    } catch (error) {
        throw new TrError(
            `Cannot get list of validation audit stats in table ${tableName} database (knex error: ${error})`,
            'DBQCR0004',
            'DatabaseCannotListBecauseDatabaseError'
        );
    }
};

/**
 * Streams the interviews instead of returning them all together. Useful for
 * tasks and operations that require parsing a possibly large number of
 * interviews, like exports or global audits.
 *
 * Note: When processing a row involves writing data back to the database, it is
 * necessary to pause the stream to avoid deadlocks and resume after the
 * updates. Use `queryStream.pause()` and `queryStream.resume()` to do so.
 *
 * @param {Object} params The parameters of the stream query
 * @param {{ [key: string]: ValueFilterType }} params.filters specifies the
 * fields on which to filter the interviews to stream.
 * @param {Object} [params.select] allows to fine-tune the fields to return,
 * including or excluding audits, and some combination or responses and
 * validated_data
 * @param {boolean} [params.select.includeAudits=true] whether to include the
 * audits in the stream
 * @param {boolean} [params.select.includeInterviewerData=false] whether to
 * include the interviewer accesses data in the stream
 * @param {'none' | 'participant' | 'validated' | 'both' |
 * 'validatedIfAvailable'} [params.select.responses='both'] which responses to
 * include in the stream
 * @param {(string | { field: string; order: 'asc' | 'desc' })[]} [params.sort]
 * specifies which field to sort the interviews by. By default, it is not sorted
 * @returns An interview stream
 */
const getInterviewsStream = function (params: {
    filters: { [key: string]: ValueFilterType };
    select?: {
        includeAudits?: boolean;
        includeInterviewerData?: boolean;
        responses?: 'none' | 'participant' | 'validated' | 'both' | 'validatedIfAvailable';
    };
    sort?: (string | { field: string; order: 'asc' | 'desc' })[];
}) {
    // FIXME: Add the p.email and p.username
    const baseRawFilter = 'participant.is_valid IS TRUE AND participant.is_test IS NOT TRUE';
    const [rawFilter, bindings] = updateRawWhereClause(params.filters, baseRawFilter);
    const sortFields = params.sort || [];
    const selectFields = Object.assign(
        { includeAudits: true, responses: 'both', includeInterviewerData: false },
        params.select || {}
    );
    const responseType = selectFields.responses || 'both';
    const select = [
        'i.id',
        'i.uuid',
        'i.updated_at',
        'i.is_valid',
        'i.is_completed',
        'i.is_validated',
        'i.is_questionable',
        'i.survey_id',
        knex.raw('case when validated_data is null then false else true end as validated_data_available')
    ];
    if (selectFields.includeAudits || selectFields.includeAudits === undefined) {
        select.push('i.audits');
    }
    switch (responseType) {
    case 'participant':
        select.push('i.responses');
        break;
    case 'validated':
        select.push('i.validated_data');
        break;
    case 'both':
        select.push('i.responses');
        select.push('i.validated_data');
        break;
    case 'validatedIfAvailable':
        select.push(
            knex.raw('case when validated_data is null then responses else validated_data end as responses')
        );
        break;
    case 'none':
        break;
    }
    let accessJoinTbl: undefined | QueryBuilder = undefined;
    if (selectFields.includeInterviewerData) {
        accessJoinTbl = knex(accessTable)
            .select('interview_id')
            .count('interview_id', { as: 'interviewer_count' })
            .where('for_validation', false)
            .groupBy('interview_id')
            .as('accesses');
        select.push('interviewer_count');
        select.push(
            knex.raw(
                `case when participant.username like '${INTERVIEWER_PARTICIPANT_PREFIX}_%' then true else false end as interviewer_created`
            )
        );
    }
    const interviewsQuery = knex
        .select(...select)
        .from(`${tableName} as i`)
        .leftJoin(`${participantTable} as participant`, 'i.participant_id', 'participant.id');
    if (accessJoinTbl !== undefined) {
        interviewsQuery.leftJoin(accessJoinTbl as any, 'i.id', 'accesses.interview_id');
    }

    interviewsQuery.whereRaw(rawFilter, bindings);
    sortFields.forEach((field) => {
        addOrderByClause(interviewsQuery, field, 'i');
    });
    interviewsQuery.orderBy('i.id');
    return interviewsQuery.stream();
};

/**
 * Streams the interview logs.  Logs will be split such that each row is a
 * single timestamped log data from the logs array.
 *
 * @param {number|undefined} interviewId The id of the interview to get the logs for
 * @returns An interview logs stream. Returned fields are the interview id,
 * uuid, updated_at, is_valid, is_completed, is_validated, is_questionable, as
 * well as for each log entry the timestamp and the values_by_path and
 * unset_paths data
 */
const getInterviewLogsStream = function (interviewId?: number) {
    // FIXME: Add the p.email and p.username
    const select = [
        'i.id',
        'i.uuid',
        'i.updated_at',
        'i.is_valid',
        'i.is_completed',
        'i.is_validated',
        'i.is_questionable',
        knex.raw('json_array_elements(logs) as logEntry')
    ];

    const interviewsLogEntriesQuery = knex
        .select(...select)
        .from(`${tableName} as i`)
        .whereNotNull('logs');
    if (interviewId) {
        interviewsLogEntriesQuery.andWhere('i.id', interviewId);
    }
    return knex
        .select([
            'id',
            'uuid',
            'updated_at',
            'is_valid',
            'is_completed',
            'is_validated',
            'is_questionable',
            knex.raw('(logEntry->>\'timestamp\')::numeric as timestamp'),
            knex.raw('logEntry->\'valuesByPath\' as values_by_path'),
            knex.raw('logEntry->\'unsetPaths\' as unset_paths')
        ])
        .from(interviewsLogEntriesQuery)
        .orderBy(['id', 'timestamp'])
        .stream();
};

export default {
    findByResponse,
    getInterviewByUuid,
    getInterviewIdByUuid,
    getUserInterview,
    create,
    update,
    getList,
    getValidationAuditStats,
    getInterviewsStream,
    getInterviewLogsStream
};
