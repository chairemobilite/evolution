/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { get } from 'lodash';
import { Response } from 'express';
import papaparse from 'papaparse';
import moment from 'moment-timezone';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

/**
 * Download the CSV file with the expected responses.
 * @param {Object} params - The parameters object.
 * @param {Response} params.res - The response object.
 * @param {string} params.fileName - The name of the CSV file to be downloaded.
 * @param {string[]} params.requestedResponses - The requested responses to include in the CSV.
 * @example
 * // Example requestedResponses:
 * ['_isCompleted', 'access_token', 'end.commentsOnSurvey']
 * @returns {Promise<void>} - The CSV content as a response.
 */
export const downloadCsvFile = async ({
    res,
    fileName,
    requestedResponses
}: {
    res: Response;
    fileName: string;
    requestedResponses: string[];
}): Promise<void> => {
    try {
        console.log(`CSV file downloaded started for ${fileName}.`);

        // Fetch the data from the database using a stream
        const queryStream = knex
            .select('i.id as interview_id', 'p.email AS user_email', 'p.username AS user_username', 'responses')
            .from('sv_interviews AS i')
            .leftJoin('sv_participants AS p', 'i.participant_id', 'p.id')
            .orderBy('i.id')
            .stream();

        const csvContent: { [key: string]: string | number | boolean | null }[] = [];

        // Prepare CSV content with the query stream
        await new Promise<void>((resolve, reject) => {
            queryStream
                .on('error', (error) => {
                    console.error('CSV file downloaded error for ${fileName}:`', error);
                    reject(error);
                })
                .on('data', (row) => {
                    // Prepare the CSV row with default values
                    const csvRow: { [key: string]: string | number | boolean | null } = {
                        interview_id: row.interview_id,
                        user_email: row.user_email,
                        user_username: row.user_username
                    };

                    requestedResponses.forEach((response) => {
                        // We use lodash's get function to safely access nested properties
                        csvRow[response] = get(row.responses, response, null);
                    });

                    csvContent.push(csvRow);
                    queryStream.resume();
                })
                .on('end', () => {
                    console.log(`CSV file downloaded successfully for ${fileName}.`);
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
