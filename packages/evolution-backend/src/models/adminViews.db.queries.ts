/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';

const tableName = 'sv_materialized_views';

const createView = async (viewName: string, viewQuery: string) => {
    return await knex.transaction(async (trx) => {
        await knex.schema
            .createMaterializedView(viewName, (view) => {
                view.as(knex.select('*').fromRaw(`(${viewQuery}) as viewTbl`));
            })
            .transacting(trx);
        await knex(tableName).insert({ view_name: viewName, view_query: viewQuery }).transacting(trx);
    });
};

const replaceView = async (viewName: string, viewQuery: string) => {
    return await knex.transaction(async (trx) => {
        await knex.schema.dropMaterializedViewIfExists(viewName).transacting(trx);
        await knex.schema
            .createMaterializedView(viewName, (view) => {
                view.as(knex.select('*').fromRaw(`(${viewQuery}) as viewTbl`));
            })
            .transacting(trx);
        await knex(tableName).update({ view_query: viewQuery }).where('view_name', viewName).transacting(trx);
    });
};

const registerView = async (viewName: string, viewQuery: string) => {
    try {
        // Verify if the view exists in the view table
        const adminView = await knex(tableName).where('view_name', viewName);

        // If not, create the materialize view and register the view to the view table
        if (adminView.length === 0) {
            await createView(viewName, viewQuery);
        } else if (adminView[0].view_query !== viewQuery) {
            // If it exists, but the query is different, delete and re-create the view
            await replaceView(viewName, viewQuery);
        }

        return true;
    } catch (error) {
        throw new TrError(
            `Error registering view ${viewName} in database (knex error: ${error})`,
            'DBADMV0001',
            'CannotRegisterViewBecauseDatabaseError'
        );
    }
};

const viewExists = async (viewName: string) => {
    try {
        const adminView = await knex(tableName).where('view_name', viewName).select('id');
        return adminView.length !== 0;
    } catch (error) {
        console.error(`Error querying the existence of admin view ${viewName}: (knex error: ${error})`);
        return false;
    }
};

/**
 * Refresh the view content in the database (this re-executes the view query)
 *
 * @param viewName Name of the view to refresh
 * @returns Whether the view was successfully refreshed or not
 */
const refreshView = async (viewName: string) => {
    try {
        if (!(await viewExists(viewName))) {
            return false;
        }
        await knex.schema.refreshMaterializedView(viewName);
        return true;
    } catch (error) {
        console.error(`Error updating view ${viewName} in database (knex error: ${error})`);
        return false;
    }
};

/**
 * Refresh all materialized views' content in the database (this re-executes the query for all views)
 * @returns `true` when all views have been updated, `false` otherwise
 */
const refreshAllViews = async () => {
    try {
        // Refresh all materialized views
        const adminViews = await knex(tableName).select('*');
        const promises: Promise<unknown>[] = [];
        for (let i = 0; i < adminViews.length; i++) {
            promises.push(knex.schema.refreshMaterializedView(adminViews[i].view_name as string));
        }
        await Promise.all(promises);
        return true;
    } catch (error) {
        console.error(`Error updating view all materialized views in database (knex error: ${error})`);
        return false;
    }
};

/**
 * Query a view for various columns.
 *
 * Evolution does not control the views and their content. In case of errors or
 * unexisting view, to avoid throwing exceptions, a value of `false` is
 * returned.
 *
 * @param viewName The name of the view
 * @param columns An array of columns to query
 * @returns The records for this query, or `false` if any error occurred during
 * the query
 */
const queryView = async (viewName: string, columns: string[] = []): Promise<{ [key: string]: unknown }[] | false> => {
    try {
        if (!(await viewExists(viewName))) {
            return false;
        }
        return await knex(viewName).select(columns.length === 0 ? '*' : columns);
    } catch (error) {
        console.error(`Error querying view ${viewName} in database (knex error: ${error})`);
        return false;
    }
};

/**
 * Query a view, with a group by and count
 *
 * Evolution does not control the views and their content. In case of errors or
 * unexisting view, to avoid throwing exceptions, a value of `false` is
 * returned.
 *
 * @param viewName The name of the view
 * @param groupBy List of fields to group by
 * @returns The records for this query, or `false` if any error occurred during
 * the query
 */
const countByView = async (
    viewName: string,
    groupBy: string[]
): Promise<{ count: number; [key: string]: unknown }[] | false> => {
    try {
        if (!(await viewExists(viewName))) {
            return false;
        }
        const results = await knex(viewName)
            .select(...groupBy)
            .count()
            .groupBy(groupBy);
        return results.map(({ count, ...rest }) => ({ count: Number(count), ...rest }));
    } catch (error) {
        console.error(`Error counting in view ${viewName} in database (knex error: ${error})`);
        return false;
    }
};

export default {
    registerView,
    viewExists,
    refreshView,
    refreshAllViews,
    queryView,
    countByView
};
