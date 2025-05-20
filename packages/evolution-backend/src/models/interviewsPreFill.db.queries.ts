/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';

const tableName = 'sv_interviews_prefill';

const getByReferenceValue = async (
    refValue: string
): Promise<{ [path: string]: { value: unknown; actionIfPresent?: 'force' | 'doNothing' } } | undefined> => {
    try {
        const interviewsQuery = await knex.select('response').from(tableName).where('reference_field', refValue);
        return interviewsQuery.length === 0 ? undefined : interviewsQuery[0].response;
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot get pre-filled response for ref value because of a database error (knex error: ${error})`,
            'TIPFQGC0001'
        );
    }
};

const setPreFilledResponseForRef = async (
    refValue: string,
    response: { [path: string]: { value: unknown; actionIfPresent?: 'force' | 'doNothing' } }
): Promise<boolean> => {
    try {
        const previousResponse = await getByReferenceValue(refValue);
        const dbObject = { reference_field: refValue, response };
        if (previousResponse === undefined) {
            await knex(tableName).insert(dbObject).returning('reference_field');
            return true;
        } else {
            await knex(tableName).update(dbObject).where('reference_field', refValue);
            return true;
        }
    } catch (error) {
        console.error(error);
        throw new TrError(
            `cannot set pre-filled response for ref value because of a database error (knex error: ${error})`,
            'TIPFQGC0002'
        );
    }
};

export default {
    getByReferenceValue,
    setPreFilledResponseForRef
};
