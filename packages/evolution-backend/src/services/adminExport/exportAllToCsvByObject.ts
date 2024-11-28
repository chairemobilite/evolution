/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _uniq from 'lodash/uniq';
import { validate as uuidValidate } from 'uuid';
import fs from 'fs';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import { unparse } from 'papaparse';
import isString from 'lodash/isString';

import { execJob } from '../../tasks/serverWorkerPool';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import interviewsDbQueries from '../../models/interviews.db.queries';
import config from 'evolution-common/lib/config/project.config';

export const filePathOnServer = 'exports/interviewData';

type AttributeAndObjectPaths = {
    attributes: string[];
    objectPaths: string[];
};

/**
 * This modifies the responses _sections object to calculate the total duration
 * of sections as otherwise, only the latest start time of each section will be
 * available.
 *
 * FIXME This won't be necessary once section logs are in a separate table
 *
 * FIXME In the case of the validated interview data, the durations will
 * probably include the time a validation may have spent looking at an interview
 * and will add up to the durations. To get the participant's duration, the file
 * with the participant data should be used. But that should not be a problem
 * when the first FIXME is fixed as we can prevent logging section logs or log
 * differently if it comes from a validator.
 *
 * @param responses
 * @returns
 */
const replaceSectionsWithDurations = (responses) => {
    // For each section, keep the first start time, the total duration, number of entries and whether it is completed
    const actualSections: {
        [sectionName: string]: { duration: number; firstStart: number; numberOfEntries: number; isCompleted: boolean };
    } = {};
    const sectionLogs = responses._sections;
    if (sectionLogs === undefined) {
        return;
    }
    const sectionActions = sectionLogs._actions || [];
    // There should only be start actions, but we never know
    const sectionStartActions = sectionActions.filter((sectionAction: any) => sectionAction.action === 'start');
    sectionStartActions.forEach((action: any, index: number) => {
        const nextAction = sectionActions[index + 1];
        if (nextAction) {
            const sectionName = action.section;
            if (actualSections[sectionName] === undefined) {
                actualSections[sectionName] = {
                    duration: 0,
                    firstStart: action.ts,
                    numberOfEntries: 0,
                    isCompleted: sectionLogs[sectionName] ? sectionLogs[sectionName]._isCompleted : false
                };
            }
            // Increase duration and increment number of entries
            actualSections[sectionName].duration += nextAction.ts - action.ts;
            actualSections[sectionName].numberOfEntries += 1;
        }
    });
    // Replace the current _sections object with the new one, the exporter will do the rest.
    responses._sections = actualSections;
};

// Test whether this attribute is an array of objects
const isArrayOfObjects = function (data: unknown): data is object[] {
    return (
        Array.isArray(data) && data.length > 0 && data.every((obj) => typeof obj === 'object' && !Array.isArray(obj))
    );
};

const getNestedAttributes = function (
    parentAttribute: string,
    _object: { [key: string]: unknown },
    attributesAndObjectPaths: AttributeAndObjectPaths = {
        attributes: [],
        objectPaths: []
    }
) {
    for (const attribute in _object) {
        if (attribute === '_actions') {
            continue;
        }
        let attributeRenamed = attribute;
        const attributeIsUuid = uuidValidate(attribute);
        if (!attributeIsUuid && parentAttribute.startsWith('_sections')) {
            attributeRenamed = removeUuidsFromPath(attribute);
        } else if (attributeIsUuid) {
            attributeRenamed = '_';
        }
        if (attributeIsUuid) {
            attributesAndObjectPaths.objectPaths.push(parentAttribute);
        }

        if (isArrayOfObjects(_object[attribute])) {
            // This is an array of complex types. These will be exploded
            // like an object, but at the same level as the parent object as
            // all interviews should have the same indices (.0, .1 in the
            // paths)
            getNestedAttributes(
                (parentAttribute ? parentAttribute + '.' : '') + attributeRenamed,
                _object[attribute] as any,
                attributesAndObjectPaths
            );
        } else if (
            _object[attribute] !== undefined &&
            _object[attribute] !== null &&
            typeof _object[attribute] === 'object' &&
            !Array.isArray(_object[attribute])
        ) {
            getNestedAttributes(
                (parentAttribute ? parentAttribute + '.' : '') + attributeRenamed,
                _object[attribute] as any,
                attributesAndObjectPaths
            );
        } else {
            attributesAndObjectPaths.attributes.push((parentAttribute ? parentAttribute + '.' : '') + attributeRenamed);
        }
    }
    return attributesAndObjectPaths;
};

const getPaths = function (parentPath, _object, attributes: string[] = []) {
    for (const attribute in _object) {
        if (attribute === '_actions') {
            continue;
        }
        if (isArrayOfObjects(_object[attribute])) {
            // This is an array of complex types that needs to be exploded like an object
            getPaths((parentPath ? parentPath + '.' : '') + attribute, _object[attribute], attributes);
        } else if (
            _object[attribute] !== undefined &&
            _object[attribute] !== null &&
            typeof _object[attribute] === 'object' &&
            !Array.isArray(_object[attribute])
        ) {
            getPaths((parentPath ? parentPath + '.' : '') + attribute, _object[attribute], attributes);
        } else {
            attributes.push((parentPath ? parentPath + '.' : '') + attribute);
        }
    }
    return attributes;
};

const removeUuidsFromPath = function (path, replaceUuidsBy = '_') {
    const pathSplittedOnDot = path.split('.');
    const uuidsFound: string[] = [];
    let newPath = path;
    for (let i = 0, count = pathSplittedOnDot.length; i < count; i++) {
        const pathPart = pathSplittedOnDot[i];
        if (uuidValidate(pathPart)) {
            uuidsFound.push(pathPart);
        }
    }
    const pathPartSplittedOnUnderscores = path.split('_');
    for (let i = 0, count = pathPartSplittedOnUnderscores.length; i < count; i++) {
        const withoutDot = pathPartSplittedOnUnderscores[i].replace('.', '');
        if (uuidValidate(withoutDot)) {
            uuidsFound.push(withoutDot);
        }
    }
    if (uuidsFound.length > 0) {
        for (let i = 0, count = uuidsFound.length; i < count; i++) {
            const uuidFound = uuidsFound[i];
            newPath = newPath.replace(uuidFound, replaceUuidsBy);
        }
    }
    return newPath;
};

const getLastUuidFromPath = function (path) {
    const pathSplittedOnDot = path.split('.').reverse();
    for (let i = 0, count = pathSplittedOnDot.length; i < count; i++) {
        const pathPart = pathSplittedOnDot[i];
        if (uuidValidate(pathPart)) {
            return pathPart;
        }
    }
    return undefined;
};

const getInterviewStream = (options: ExportOptions) =>
    interviewsDbQueries.getInterviewsStream({
        filters: {},
        select: {
            includeAudits: false,
            responses: options.responseType,
            includeInterviewerData: true
        }
    });

const getRenamedPaths = async (options: ExportOptions): Promise<AttributeAndObjectPaths> => {
    const allAttributes: AttributeAndObjectPaths = {
        attributes: [],
        objectPaths: []
    };
    const queryStream = getInterviewStream(options);
    let i = 0;
    return new Promise((resolve, reject) => {
        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                const interview = row;
                const responses = interview.responses;
                replaceSectionsWithDurations(responses);
                const newAttributes = getNestedAttributes('', responses, undefined);
                allAttributes.attributes.push(...newAttributes.attributes);
                allAttributes.objectPaths.push(...newAttributes.objectPaths);
                allAttributes.attributes = _uniq(allAttributes.attributes).sort((a, b) => {
                    return a.localeCompare(b);
                });
                allAttributes.objectPaths = _uniq(allAttributes.objectPaths).sort((a, b) => {
                    return b.split('._.').length - a.split('._.').length;
                });

                //fs.writeFileSync(exportJsonFileDirectory + '/' + interview.id + '__' + interview.uuid + '.json', JSON.stringify(responses));
                if ((i + 1) % 1000 === 0) {
                    console.log(`reading paths for interview ${i + 1}`);
                }
                i++;
            })
            .on('end', () => {
                console.log('all interview paths generated');
                resolve(allAttributes);
            });
    });
};

/**
 * Get all paths available in the responses, with each object type having its
 * own set of paths. The root object is `interview`
 * @param options export options.
 * @returns An object where the keys are the objects to export and the values
 * are an array of path
 */
const getPathsByObject = async (options: ExportOptions): Promise<{ [objName: string]: string[] }> => {
    const paths = await getRenamedPaths(options);

    const pathsByObject = {
        interview: [
            'hasValidatedData',
            'is_valid',
            'is_completed',
            'is_validated',
            'is_questionable',
            '_interviewer_created',
            '_interviewer_count'
        ]
    };

    // Initialise the pathsByObject, which should create a file per object
    for (let i = 0, count = paths.objectPaths.length; i < count; i++) {
        const objectPath = paths.objectPaths[i];
        pathsByObject[objectPath] = [];
    }

    // For each attribute path, see if it is part of an object, otherwise, it is added to the interviews paths
    for (let i = 0, count = paths.attributes.length; i < count; i++) {
        let foundObjectPath = false;
        const attribute = paths.attributes[i];
        let attributeNamespace = '';
        for (let j = 0; j < paths.objectPaths.length; j++) {
            const objectPath = paths.objectPaths[j];
            // Object paths are sorted by length, so the first one that is a prefix of the attribute is the one we want
            if (attribute.startsWith(objectPath + '.') && objectPath.length > attributeNamespace.length) {
                attributeNamespace = objectPath;
                pathsByObject[objectPath].push(attribute);
                foundObjectPath = true;
            }
        }
        if (!foundObjectPath) {
            pathsByObject['interview'].push(attribute);
        }
    }

    for (const objectPath in pathsByObject) {
        pathsByObject[objectPath] = pathsByObject[objectPath].sort((a, b) => {
            return a.localeCompare(b);
        });
    }

    return pathsByObject;
};

/**
 * Handle the coordinates to be exported to CSV as separate lat and lon columns
 * @param container The object to add the coordinates to
 * @param pathKey The path key to use to add the coordinates to
 * @param value The value to add to the coordinates
 */
const handleCoordinates = (container: any, pathKey: string, value: unknown) => {
    // force create the fields even if empty otherwise you may end up with an empty header for the lat/lon column if the first row has an empty geometry:
    container[pathKey.replace('.coordinates', '') + '.lon'] = undefined;
    container[pathKey.replace('.coordinates', '') + '.lat'] = undefined;

    if (Array.isArray(value)) {
        container[pathKey.replace('.coordinates', '') + '.lon'] = value[0];
        container[pathKey.replace('.coordinates', '') + '.lat'] = value[1];
    }
};

/**
 * Format the value to be exported to CSV (remove newlines and quotes)
 * @param value The value to format
 * @returns The formatted value
 */
const formatValue = (value: unknown): unknown => {
    let valueString = value;
    if (Array.isArray(valueString)) {
        valueString = valueString.join('|');
    }
    return valueString && isString(valueString)
        ? valueString.replaceAll('\n', ' ').replaceAll('\r', '').replaceAll('"', '')
        : valueString;
};

/**
 * Task to generate the CSV files by object.
 *
 * NOTE: THIS SHOULD ONLY BE CALLED FROM A WORKERPOOL OR TASKS, NOT THE MAIN
 * THREAD
 *
 * FIXME It is error prone that those 2 functions are in the same file. One
 * could be called in the wrong context. See how we could make the execution
 * more generic when we have a few more tasks to execute in the pool.
 *
 * @param {ExportOptions} options The export options
 * @returns
 */
export const exportAllToCsvByObjectTask = async function (
    options: ExportOptions = { responseType: 'validatedIfAvailable' }
) {
    const pathsByObject = await getPathsByObject(options);

    // Initialize export data objects with all possible fields for each path.
    // Those will be the base object to fill for each interview, to make sure all
    // keys are available for each exported row.
    const exportedDataByObjectPath: any = {};
    for (const objectPath in pathsByObject) {
        exportedDataByObjectPath[objectPath] = {};
        for (let i = 0, count = pathsByObject[objectPath].length; i < count; i++) {
            if (objectPath !== 'interview') {
                exportedDataByObjectPath[objectPath]._interviewUuid = undefined;
                exportedDataByObjectPath[objectPath]._parentUuid = undefined;
            } else {
                exportedDataByObjectPath[objectPath]._interviewUuid = undefined;
            }
            const pathWithoutObjectPath = pathsByObject[objectPath][i].replace(objectPath + '._.', '');
            if (pathWithoutObjectPath.endsWith('.geometry.coordinates')) {
                handleCoordinates(exportedDataByObjectPath[objectPath], pathWithoutObjectPath, undefined);
            } else {
                exportedDataByObjectPath[objectPath][pathWithoutObjectPath] = undefined;
            }
        }
    }

    // create csv files and streams:
    // Make sure the file path exists
    fileManager.directoryManager.createDirectoryIfNotExists(filePathOnServer);
    const csvFilePathByObjectPath: {
        [objectName: string]: fs.WriteStream;
    } = {};
    const wroteHeaderByObjectPath = {};
    const csvFilePaths: string[] = [];
    const fileNamePrefix = options.responseType === 'validatedIfAvailable' ? 'validated' : 'participant';
    for (const objectPath in pathsByObject) {
        const csvFilePath = `${filePathOnServer}/${fileNamePrefix}_${objectPath.replaceAll('._.', '_').replaceAll('.', '_')}_${config.projectShortname}.csv`;
        const csvStream = fs.createWriteStream(fileManager.getAbsolutePath(csvFilePath));
        csvStream.on('error', console.error);
        csvFilePathByObjectPath[objectPath] = csvStream;
        csvFilePaths.push(csvFilePath);
        wroteHeaderByObjectPath[objectPath] = false;
    }

    console.log('reading interview data...');

    const queryStream = getInterviewStream(options);
    let i = 0;

    return new Promise((resolve, reject) => {
        let pauseCount = 0;
        const writeToFile = (stream: fs.WriteStream, data: string) => {
            const fileOk = stream.write(data);
            if (!fileOk) {
                // Buffer full, pause the db stream and wait for a drain event.
                // Since many streams can reach buffer full at the same time, we
                // count the number of pauses and resume only when all drain
                // events have been reached.
                pauseCount++;
                queryStream.pause();
                stream.once('drain', () => {
                    pauseCount--;
                    if (pauseCount === 0) {
                        queryStream.resume();
                    }
                });
            }
        };

        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                const interview = row;
                const responses = interview.responses;
                replaceSectionsWithDurations(responses);
                const exportedInterviewDataByObjectPath = _cloneDeep(exportedDataByObjectPath);

                const interviewPaths = getPaths('', responses, undefined);
                const objectsByObjectPath = {
                    interview: exportedInterviewDataByObjectPath.interview
                };
                objectsByObjectPath.interview.hasValidatedData = row.validated_data_available;
                objectsByObjectPath.interview.is_valid = interview.is_valid;
                objectsByObjectPath.interview.is_completed = interview.is_completed;
                objectsByObjectPath.interview.is_validated = interview.is_validated;
                objectsByObjectPath.interview.is_questionable = interview.is_questionable;
                objectsByObjectPath.interview._interviewUuid = interview.uuid;
                objectsByObjectPath.interview._interviewer_count = interview.interviewer_count;
                objectsByObjectPath.interview._interviewer_created = interview.interviewer_created;
                //console.log('interviewPaths', interviewPaths);

                for (let j = 0, countJ = interviewPaths.length; j < countJ; j++) {
                    const path = interviewPaths[j];
                    const pathUuid = getLastUuidFromPath(path);
                    const pathWithoutUuids = removeUuidsFromPath(path);
                    let foundObjectPath = false;
                    for (const objectPath in exportedInterviewDataByObjectPath) {
                        if (pathWithoutUuids.startsWith(objectPath + '.')) {
                            if (!objectsByObjectPath[objectPath]) {
                                objectsByObjectPath[objectPath] = {};
                            }
                            if (!objectsByObjectPath[objectPath][pathUuid]) {
                                objectsByObjectPath[objectPath][pathUuid] = _cloneDeep(
                                    exportedInterviewDataByObjectPath[objectPath]
                                );
                                objectsByObjectPath[objectPath][pathUuid]._interviewUuid = interview.uuid;
                            }
                            if (path.endsWith('._uuid') && !objectsByObjectPath[objectPath][pathUuid]._parentUuid) {
                                const parentUuid = _get(
                                    responses,
                                    surveyHelperNew.getPath(path, '../../../_uuid') as string
                                );
                                objectsByObjectPath[objectPath][pathUuid]._parentUuid = parentUuid
                                    ? parentUuid
                                    : interview.uuid;
                            }
                            const value = _get(responses, path);
                            const pathSuffix = pathWithoutUuids.replace(objectPath + '._.', '');

                            if (pathSuffix.endsWith('.geometry.coordinates')) {
                                handleCoordinates(objectsByObjectPath[objectPath][pathUuid], pathSuffix, value);
                            } else {
                                objectsByObjectPath[objectPath][pathUuid][pathSuffix] = formatValue(value);
                            }
                            foundObjectPath = true;
                            break;
                        }
                    }
                    if (!foundObjectPath) {
                        const value = _get(responses, path);
                        if (pathWithoutUuids.endsWith('.geometry.coordinates')) {
                            handleCoordinates(objectsByObjectPath.interview, pathWithoutUuids, value);
                        } else {
                            objectsByObjectPath.interview[pathWithoutUuids] = formatValue(value);
                        }
                    }
                }

                for (const objectPath in objectsByObjectPath) {
                    if (objectPath !== 'interview') {
                        const objectsToWrite = Object.values(objectsByObjectPath[objectPath]) as any[];
                        writeToFile(
                            csvFilePathByObjectPath[objectPath],
                            unparse(objectsToWrite, {
                                header: !wroteHeaderByObjectPath[objectPath],
                                newline: '\n',
                                quoteChar: '"',
                                delimiter: ',',
                                quotes: true
                            }) + '\n'
                        );
                        wroteHeaderByObjectPath[objectPath] = true;
                    } else {
                        writeToFile(
                            csvFilePathByObjectPath[objectPath],
                            unparse([objectsByObjectPath[objectPath]], {
                                header: !wroteHeaderByObjectPath[objectPath],
                                newline: '\n',
                                quoteChar: '"',
                                delimiter: ',',
                                quotes: true
                            }) + '\n'
                        );
                        wroteHeaderByObjectPath[objectPath] = true;
                    }
                }

                if ((i + 1) % 1000 === 0) {
                    console.log(`interview ${i + 1}`);
                }
                i++;
            })
            .on('end', () => {
                console.log('All interview objects exported for response type: ', options.responseType);
                const csvStreamEndPromises = Object.keys(csvFilePathByObjectPath).map(
                    (object) => new Promise<void>((resolve) => csvFilePathByObjectPath[object].end(() => resolve()))
                );
                Promise.all(csvStreamEndPromises)
                    .then(() => resolve(csvFilePaths))
                    .catch((error) => reject(error));
            });
    });
};

// eslint-disable-next-line @typescript-eslint/ban-types
let runningExportNonce: undefined | Object = undefined;

/**
 * Function that will run a task to export all interview data to CSV by object.
 * Then current export status can be followed using the `isExportRunning`
 * function. The actual file preparation will be done in a workerpool.
 *
 * @param options The export options
 * @returns A message saying the export is started
 */
export const exportAllToCsvByObject = function (options: ExportOptions) {
    if (runningExportNonce !== undefined) {
        return 'alreadyRunning';
    }
    runningExportNonce = new Object();
    execJob('exportAllToCsvByObject', [options])
        .then(() => console.log('Export by object completed'))
        .catch((error) => {
            console.log('Export by object failed:', error);
        })
        .then(() => {
            runningExportNonce = undefined;
        });
    return 'exportStarted';
};

export const isExportRunning = () => runningExportNonce !== undefined;

export const getExportFiles = () => fileManager.directoryManager.getFiles(filePathOnServer) || [];
