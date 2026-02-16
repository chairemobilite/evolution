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
import type { Parser } from 'bowser';

export const filePathOnServer = 'exports/interviewLogs';
const validationsPrefix = 'validations.';
const responsePrefix = 'response.';
const correctedResponsePrefix = 'corrected_response.';

type ContextData = { platform?: string; os?: string; browser?: string; language?: string };
type CurrentInterviewContext = {
    interviewId?: number;
    participant: { [userId: string | 'participant']: ContextData };
    corrected: { [userId: string]: ContextData };
};

type ExportLogOptions = {
    participantResponseOnly?: boolean;
    withValues?: boolean;
    interviewId?: number;
};

const rowShouldBeExported = (
    logData: { values_by_path: { [key: string]: any }; unset_paths: string[]; user_action?: unknown },
    participantResponseOnly: boolean
) => {
    if (participantResponseOnly === false) {
        return true;
    }
    const valuesByPath = logData.values_by_path || {};
    const filteredValuesByPath = Object.keys(valuesByPath)
        .filter((key) => key.startsWith(responsePrefix))
        .reduce((acc, key) => {
            acc[key] = valuesByPath[key];
            return acc;
        }, {});
    const filteredUnsetPaths = (logData.unset_paths || []).filter((path) => path.startsWith(responsePrefix));
    return !(_isBlank(filteredValuesByPath) && _isBlank(filteredUnsetPaths) && _isBlank(logData.user_action));
};

const userActionToWidgetData = (
    userAction: UserAction | undefined
): { widgetType: string; widgetPath: string; hiddenWidgets: string; invalidWidgets: string[] } => {
    if (userAction === undefined || _isBlank(userAction)) {
        return { widgetType: '', widgetPath: '', hiddenWidgets: '', invalidWidgets: [] };
    }
    switch (userAction.type) {
    case 'buttonClick':
        return {
            widgetType: '',
            widgetPath: userAction.buttonId,
            hiddenWidgets: userAction.hiddenWidgets ? userAction.hiddenWidgets.join('|') : '',
            invalidWidgets: userAction.invalidWidgets ? userAction.invalidWidgets : []
        };
    case 'widgetInteraction':
        return {
            widgetType: userAction.widgetType,
            widgetPath: userAction.path,
            hiddenWidgets: '',
            invalidWidgets: []
        };
    case 'sectionChange':
        return {
            widgetType: '',
            widgetPath: [
                userAction.targetSection.sectionShortname,
                ...(userAction.targetSection.iterationContext || [])
            ].join('/'),
            hiddenWidgets: userAction.hiddenWidgets ? userAction.hiddenWidgets.join('|') : '',
            invalidWidgets: []
        };
    default:
        return {
            widgetType: '',
            widgetPath: '',
            hiddenWidgets: '',
            invalidWidgets: []
        };
    }
};

const updateAndGetContextDataFromLog = (
    logData: {
        values_by_path: { [key: string]: any };
        user_action?: UserAction;
        for_correction: boolean | null;
        user_id: number | null;
    },
    currentInterviewContext: CurrentInterviewContext
): ContextData => {
    // Get the current context data for this user, or initialize it if not present yet
    const userId = logData.user_id === null ? 'participant' : logData.user_id.toString();
    const interviewContext =
        logData.for_correction === true ? currentInterviewContext.corrected : currentInterviewContext.participant;
    const contextData: ContextData = interviewContext[userId] || {
        platform: undefined,
        os: undefined,
        browser: undefined,
        language: undefined
    };

    // See if the log data contains any information about the context (platform,
    // os, browser or language) and update the current context accordingly. This
    // will allow us to have the most up to date context information for each
    // log line, even if that information is only available in a later log entry
    // for that user. We need to do this because users can change their context
    // during the interview (for example changing language), and we want to be
    // able to see that in the logs.

    // Update the browser data:
    const newBrowserData =
        logData.values_by_path?.[responsePrefix + '_browser'] ??
        logData.values_by_path?.[correctedResponsePrefix + '_browser'];
    if (newBrowserData !== undefined && newBrowserData.parsedResult !== undefined) {
        const parsedBrowser = newBrowserData.parsedResult as Parser.ParsedResult;
        contextData.os = parsedBrowser.os?.name;
        contextData.platform = parsedBrowser.platform?.type;
        contextData.browser = parsedBrowser.browser?.name;
    }

    // Update the language data:
    if (logData.user_action && logData.user_action.type === 'languageChange') {
        contextData.language = logData.user_action.language;
    } else if (
        logData.values_by_path?.[responsePrefix + '_language'] !== undefined ||
        logData.values_by_path?.[correctedResponsePrefix + '_language'] !== undefined
    ) {
        contextData.language =
            logData.values_by_path![responsePrefix + '_language'] ??
            logData.values_by_path![correctedResponsePrefix + '_language'];
    }

    // Set the current context for this user
    interviewContext[userId] = contextData;
    return contextData;
};

const exportLogToRows = (
    logData: {
        values_by_path: { [key: string]: any };
        unset_paths: string[];
        for_correction: boolean | null;
        user_id: number | null;
        [key: string]: any;
    },
    options: {
        withValues: boolean;
        participantResponseOnly?: boolean;
        currentInterviewContext: CurrentInterviewContext;
    }
): { [key: string]: any }[] => {
    const { values_by_path, unset_paths, user_action, ...rest } = logData;

    if (!options.withValues) {
        // Update current context with values from current event
        const contextData = updateAndGetContextDataFromLog(logData, options.currentInterviewContext);
        const { valuesByPath, valuesByPathInit, invalidFields, validFields } = Object.entries(
            values_by_path || {}
        ).reduce(
            (
                acc: {
                    valuesByPath: string[];
                    valuesByPathInit: string[];
                    invalidFields: string[];
                    validFields: string[];
                },
                [key, value]
            ) => {
                if (key.startsWith(validationsPrefix)) {
                    if (value === false) {
                        acc.invalidFields.push(key.replace(validationsPrefix, ''));
                    } else {
                        acc.validFields.push(key.replace(validationsPrefix, ''));
                    }
                } else if (value === null) {
                    acc.valuesByPathInit.push(key);
                } else {
                    acc.valuesByPath.push(key);
                }
                return acc;
            },
            { valuesByPath: [], valuesByPathInit: [], invalidFields: [], validFields: [] }
        );

        const { invalidWidgets, ...userActionFields } = userActionToWidgetData(user_action);
        const allInvalidFields = invalidFields.concat(invalidWidgets);

        return [
            {
                ...rest,
                ...contextData,
                ...userActionFields,
                modifiedFields: valuesByPath.length > 0 ? valuesByPath.join('|') : '',
                initializedFields: valuesByPathInit.length > 0 ? valuesByPathInit.join('|') : '',
                // Don't include validation paths in the unset fields
                unsetFields: (unset_paths || []).filter((path) => !path.startsWith(validationsPrefix)).join('|'),
                invalidFields: allInvalidFields.length > 0 ? allInvalidFields.join('|') : '',
                validFields: validFields.length > 0 ? validFields.join('|') : ''
            }
        ];
    }
    // With values, return one row per key-value pair, with unset path returning an empty value
    return Object.entries(values_by_path)
        .filter(([key, _value]) => !options.participantResponseOnly || key.startsWith(responsePrefix))
        .map(([key, value]) => ({
            ...rest,
            field: key,
            value: JSON.stringify(value)
        }))
        .concat(
            (unset_paths || [])
                .filter((path) => !options.participantResponseOnly || path.startsWith(responsePrefix))
                .map((path) => ({
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

    const queryStream = paradataEventsQueries.getParadataStream({
        interviewId,
        forCorrection: participantResponseOnly === true ? false : undefined
    });
    let i = 0;
    let currentInterviewContext: CurrentInterviewContext = {
        interviewId: undefined,
        corrected: {},
        participant: {}
    };
    return new Promise((resolve, reject) => {
        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                const { timestamp_sec, event_date, ...logData } = row;

                // FIXME Filter also on the user_action when we support more than just legacy events

                // Filter the log data according to export options, since older
                // log events may have `null` values for the for_correction
                // field, we still need to filter the data here, but the
                // paradata stream should already have done that.
                if (row.for_correction === null && !rowShouldBeExported(row, participantResponseOnly)) {
                    // no data to export for this log
                    return;
                }
                if (currentInterviewContext.interviewId !== logData.id) {
                    currentInterviewContext = {
                        interviewId: logData.id,
                        corrected: {},
                        participant: {}
                    };
                }

                // Prepare the log data to export
                const exportLog = exportLogToRows(
                    {
                        ...logData,
                        event_date: new Date(event_date).toISOString(),
                        timestampMs: Math.round(timestamp_sec * 1000)
                    },
                    { withValues, participantResponseOnly, currentInterviewContext }
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
