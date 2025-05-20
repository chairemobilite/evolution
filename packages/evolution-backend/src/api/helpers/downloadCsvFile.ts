/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { get } from 'lodash';
import { Response } from 'express';
import papaparse from 'papaparse';
import moment from 'moment';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

// Restricted response to exclude from the CSV
export type ExcludedField = 'interview_id' | 'user_email' | 'user_username';

/**
 * Download the CSV file with the expected response.
 * @param {Object} params - The parameters object.
 * @param {Response} params.res - The response object.
 * @param {string} params.fileName - The name of the CSV file to be downloaded.
 * @param {string[]} params.requestedFields - The fields to include in the CSV.
 * @param {ExcludedField[]} [params.excludeFields] - The fields to exclude from the CSV.
 * @example
 * // Example requestedFields:
 * ['_isCompleted', 'access_token', 'end.commentsOnSurvey']
 * // Example excludeFields:
 * ['interview_id', 'user_email', 'user_username']
 * @returns {Promise<void>} - The CSV content as a response.
 */
export const downloadCsvFile = async ({
    res,
    fileName,
    requestedFields,
    excludeFields
}: {
    res: Response;
    fileName: string;
    requestedFields: string[];
    excludeFields?: ExcludedField[];
}): Promise<void> => {
    try {
        console.log(`CSV file downloaded started for ${fileName}.`);

        // Fetch the data from the database using a stream
        const queryStream = knex
            .select('i.id as interview_id', 'p.email AS user_email', 'p.username AS user_username', 'response')
            .from('sv_interviews AS i')
            .leftJoin('sv_participants AS p', 'i.participant_id', 'p.id')
            .orderBy('i.id')
            .stream();

        const csvContent: { [key: string]: string | number | boolean | null }[] = [];

        // Prepare CSV content with the query stream
        await new Promise<void>((resolve, reject) => {
            queryStream
                .on('error', (error) => {
                    console.error('Data prepared to generate CSV file error for ${fileName}:`', error);
                    reject(error);
                })
                .on('data', (row) => {
                    const csvRow: { [key: string]: string | number | boolean | null } = {};

                    // Add if not restricted
                    if (!excludeFields?.includes('interview_id')) {
                        csvRow.interview_id = row.interview_id;
                    }
                    if (!excludeFields?.includes('user_email')) {
                        csvRow.user_email = row.user_email;
                    }
                    if (!excludeFields?.includes('user_username')) {
                        csvRow.user_username = row.user_username;
                    }

                    // Add requested fields
                    requestedFields.forEach((response) => {
                        csvRow[response] = get(row.response, response, null);
                    });

                    csvContent.push(csvRow);
                })
                .on('end', () => {
                    console.log(`Data prepared to generate CSV file for ${fileName}.`);
                    resolve();
                });
        });

        // Set headers and send the CSV file
        res.setHeader('Content-disposition', `attachment; filename=${fileName}_${moment().format('YYYYMMDD')}.csv`);
        res.set('Content-Type', 'text/csv');
        res.status(200).send(papaparse.unparse(csvContent));
    } catch (error) {
        console.error(`Error downloading CSV file for ${fileName}:`, error);
        res.status(500).send('Internal Server Error');
    }
};
