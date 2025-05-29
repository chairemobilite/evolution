/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import { unparse } from 'papaparse';
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

import { execJob } from '../../tasks/serverWorkerPool';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import paradataEventsQueries from '../../models/paradataEvents.db.queries';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const filePathOnServer = 'exports/interviewLogs';

type ExportLogOptions = {
    participantResponseOnly?: boolean;
    withValues?: boolean;
    interviewId?: number;
};

const filterLogData = (
    logData: { values_by_path: { [key: string]: any }; unset_paths: string[] },
    participantResponseOnly: boolean
) => {
    const valuesByPath = logData.values_by_path || {};
    if (participantResponseOnly === false) {
        return {
            filteredValuesByPath: valuesByPath,
            filteredUnsetPaths: logData.unset_paths
        };
    }
    const filteredValuesByPath = Object.keys(valuesByPath)
        .filter((key) => key.startsWith('response.'))
        .reduce((acc, key) => {
            acc[key] = valuesByPath[key];
            return acc;
        }, {});
    const filteredUnsetPaths = (logData.unset_paths || []).filter((path) => path.startsWith('response.'));
    return {
        filteredValuesByPath,
        filteredUnsetPaths
    };
};

const userActionToWidgetData = (userAction: UserAction | undefined): { widgetType: string; widgetPath: string } => {
    if (userAction === undefined || _isBlank(userAction)) {
        return { widgetType: '', widgetPath: '' };
    }
    switch (userAction.type) {
    case 'buttonClick':
        return {
            widgetType: '',
            widgetPath: userAction.buttonId
        };
    case 'widgetInteraction':
        return {
            widgetType: userAction.widgetType,
            widgetPath: userAction.path
        };
    case 'sectionChange':
        return {
            widgetType: '',
            widgetPath: [
                userAction.targetSection.sectionShortname,
                ...(userAction.targetSection.iterationContext || [])
            ].join('/')
        };
    default:
        return {
            widgetType: '',
            widgetPath: ''
        };
    }
};

const exportLogToRows = (
    logData: { values_by_path: { [key: string]: any }; unset_paths: string[]; [key: string]: any },
    withValues: boolean
): { [key: string]: any }[] => {
    const { values_by_path, unset_paths, user_action, ...rest } = logData;
    if (!withValues) {
        const { valuesByPath, valuesByPathInit } = Object.entries(values_by_path).reduce(
            (acc: { valuesByPath: string[]; valuesByPathInit: string[] }, [key, value]) => {
                if (value === null) {
                    acc.valuesByPathInit.push(key);
                } else {
                    acc.valuesByPath.push(key);
                }
                return acc;
            },
            { valuesByPath: [], valuesByPathInit: [] }
        );

        return [
            {
                ...rest,
                ...userActionToWidgetData(user_action),
                modifiedFields: !_isBlank(valuesByPath) ? valuesByPath.join('|') : '',
                initializedFields: !_isBlank(valuesByPathInit) ? valuesByPathInit.join('|') : '',
                unsetFields: (unset_paths || []).join('|')
            }
        ];
    }
    // With values, return one row per key-value pair, with unset path returning an empty value
    return Object.entries(values_by_path)
        .map(([key, value]) => ({
            ...rest,
            field: key,
            value: JSON.stringify(value)
        }))
        .concat(
            (unset_paths || []).map((path) => ({
                ...rest,
                field: path,
                value: ''
            }))
        )
        .concat(
            !_isBlank(user_action) && user_action.type === 'widgetInteraction'
                ? [
                    {
                        ...rest,
                        field: user_action.path,
                        value: JSON.stringify(user_action.value)
                    }
                ]
                : []
        );
};

/**
 * Task to export the interview logs to CSV by timestamp and interview ID
 *
 * NOTE: THIS SHOULD ONLY BE CALLED FROM A WORKERPOOL OR TASK, NOT THE MAIN
 * THREAD
 *
 * FIXME It is error prone that those 2 functions are in the same file. One
 * could be called in the wrong context. See how we could make the execution
 * more generic when we have a few more tasks to execute in the pool.
 *
 * @param {ExportLogOptions} options The export options
 * @returns The name of the file where the logs are exported
 */
export const exportInterviewLogTask = async function ({
    participantResponseOnly = false,
    withValues = false,
    interviewId
}: ExportLogOptions): Promise<string> {
    // create csv files and streams:
    // Make sure the file path exists
    fileManager.directoryManager.createDirectoryIfNotExists(filePathOnServer);
    const fileName = `interviewLogs${interviewId ? `_${interviewId}` : ''}${participantResponseOnly ? '_response' : '_all'}${withValues ? '_withValues' : ''}_${new Date().toISOString().replace(/:/g, '-')}`;
    const csvFilePath = `${filePathOnServer}/${fileName}.csv`;
    const csvStream = fs.createWriteStream(fileManager.getAbsolutePath(csvFilePath));
    csvStream.on('error', console.error);
    let headerWritten = false;

    console.log('reading interview log data...');

    const queryStream = paradataEventsQueries.getParadataStream(interviewId);
    let i = 0;
    return new Promise((resolve, reject) => {
        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                const { values_by_path, unset_paths, timestamp_sec, event_date, ...logData } = row;

                // FIXME Filter also on the user_action when we support more than just legacy events
                // Filter the log data according to export options
                const { filteredValuesByPath, filteredUnsetPaths } = filterLogData(
                    { values_by_path, unset_paths },
                    participantResponseOnly
                );
                if (_isBlank(filteredValuesByPath) && _isBlank(filteredUnsetPaths)) {
                    // no data to export for this log
                    return;
                }

                // Prepare the log data to export
                const exportLog = exportLogToRows(
                    {
                        ...logData,
                        event_date: new Date(event_date).toISOString(),
                        timestampMs: Math.round(timestamp_sec * 1000),
                        values_by_path: filteredValuesByPath,
                        unset_paths: filteredUnsetPaths
                    },
                    withValues
                );

                const fileOk = csvStream.write(
                    unparse(exportLog, {
                        header: !headerWritten,
                        newline: '\n'
                    }) + '\n'
                );
                if (!fileOk) {
                    // Buffer full, pause the db stream and wait for a drain event
                    queryStream.pause();
                    csvStream.once('drain', () => {
                        queryStream.resume();
                    });
                }
                headerWritten = true;

                if (i % 5000 === 0) {
                    console.log(`wrote ${i + 1} logs`);
                }
                i++;
            })
            .on('end', () => {
                console.log('All interview logs exported');
                csvStream.end(() => {
                    resolve(csvFilePath);
                });
            });
    });
};

let runningExportNonce: undefined | object = undefined;

/**
 * Function that will run a task to export all interview data to CSV by object.
 * Then current export status can be followed using the `isExportRunning`
 * function. The actual file preparation will be done in a workerpool.
 *
 * @param options The export options
 * @returns A message saying the export is started
 */
export const exportInterviewLogs = function (options: ExportLogOptions) {
    if (runningExportNonce !== undefined) {
        return 'alreadyRunning';
    }
    runningExportNonce = new Object();
    execJob('exportInterviewLogs', [options])
        .then(() => console.log('Export interview logs completed'))
        .catch((error) => {
            console.log('Export interview logs failed:', error);
        })
        .then(() => {
            runningExportNonce = undefined;
        });
    return 'logExportStarted';
};

export const isExportRunning = () => runningExportNonce !== undefined;

export const getExportFiles = () => fileManager.directoryManager.getFiles(filePathOnServer) || [];
