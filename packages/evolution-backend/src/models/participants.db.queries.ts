/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import _cloneDeep from 'lodash/cloneDeep';

import TrError from 'chaire-lib-common/lib/utils/TrError';

import { ParticipantAttributes } from '../services/participants/participant';

const tableName = 'sv_participants';

const create = async (newObject: Partial<ParticipantAttributes>): Promise<ParticipantAttributes> => {
    try {
        const returning = await knex(tableName).insert(newObject).returning('id');
        // Fetch newly inserted user, to get all values that may have been auto-filled at insert
        const participantAttributes = await getById(returning[0].id);
        if (participantAttributes === undefined) {
            throw 'Cannot fetch user recently inserted';
        }
        return participantAttributes;
    } catch (error) {
        throw new TrError(
            `Cannot insert participant ${newObject.email} in table ${tableName} database (knex error: ${error})`,
            'EVOPART0001',
            'DatabaseCannotCreateBecauseDatabaseError'
        );
    }
};

const getById = async (id: number): Promise<ParticipantAttributes | undefined> => {
    try {
        const response = await knex(tableName).where({ id });
        if (response.length === 1) {
            return response[0] as ParticipantAttributes;
        }
        return undefined;
    } catch (error) {
        console.error(`cannot get user by ID ${id} (knex error: ${error})`);
        return undefined;
    }
};

const find = async (
    whereData: Partial<ParticipantAttributes> & { usernameOrEmail?: string },
    orWhere = false
): Promise<ParticipantAttributes | undefined> => {
    try {
        if (Object.keys(whereData).length === 0) {
            console.error('Find user in DB: no filter specified!');
            return undefined;
        }
        const query = knex(tableName);
        if (whereData.usernameOrEmail !== undefined) {
            query.whereILike('email', whereData.usernameOrEmail);
            query.orWhere('username', whereData.usernameOrEmail);
            delete whereData.usernameOrEmail;
        }
        Object.keys(whereData).forEach((key) => {
            if (key === 'email') {
                if (orWhere) {
                    query.orWhereILike(key, whereData[key]);
                } else {
                    query.andWhereILike(key, whereData[key]);
                }
            } else {
                if (orWhere) {
                    query.orWhere(key, whereData[key]);
                } else {
                    query.andWhere(key, whereData[key]);
                }
            }
        });

        const response = await query.limit(1);
        return response.length === 1 ? (response[0] as ParticipantAttributes) : undefined;
    } catch (error) {
        console.error(`cannot search for user for data ${whereData} (knex error: ${error})`);
        return undefined;
    }
};

/**
 * Update a participant. It is not possible to change the id or email fields
 * @param id The ID of the participant to update
 * @param attributes Attributes to update. If set, `id` and `email` will be ignored
 * @returns Whether anything was changed or not
 */
const update = async (id: number, attributes: Partial<ParticipantAttributes>): Promise<boolean> => {
    try {
        if (attributes.email) {
            delete attributes.email;
        }
        if (attributes.id) {
            delete attributes.id;
        }
        if (Object.keys(attributes).length === 0) {
            return false;
        }
        const returningArray = await knex(tableName).update(attributes).where('id', id);
        return true;
    } catch (error) {
        throw new TrError(
            `Cannot update participant with id ${id} from table ${tableName} (knex error: ${error})`,
            'EVOPART0002',
            'DatabaseCannotUpdateBecauseDatabaseError'
        );
    }
};

export default {
    create,
    find,
    update,
    getById
};
