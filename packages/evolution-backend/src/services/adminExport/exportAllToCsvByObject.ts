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
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { unparse } from 'papaparse';

import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import isString from 'lodash/isString';
import interviewsDbQueries from '../../models/interviews.db.queries';

export const filePathOnServer = 'exports';

// TODO Execute in a worker pool.
// eslint-disable-next-line @typescript-eslint/ban-types
let runningExportNonce: undefined | Object = undefined;

type AttributeAndObjectPaths = {
    attributes: string[];
    objectPaths: string[];
    arrayPaths: string[];
};

const getNestedAttributes = function (
    parentAttribute: string,
    _object: { [key: string]: unknown },
    attributesAndObjectPaths: AttributeAndObjectPaths = {
        attributes: [],
        objectPaths: [],
        arrayPaths: []
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
        if (Array.isArray(_object[attribute])) {
            attributesAndObjectPaths.arrayPaths.push((parentAttribute ? parentAttribute + '.' : '') + attributeRenamed);
        }
        if (
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
        if (
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

const getRenamedPaths = async (): Promise<{ attributes: string[]; objectPaths: string[]; arrayPaths: string[] }> => {
    const allAttributes: AttributeAndObjectPaths = {
        attributes: [],
        objectPaths: [],
        arrayPaths: []
    };
    const queryStream = interviewsDbQueries.getInterviewsStream({
        filters: {},
        select: { includeAudits: false, responses: 'validatedIfAvailable' }
    });
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
                const newAttributes = getNestedAttributes('', responses, undefined);
                allAttributes.attributes.push(...newAttributes.attributes);
                allAttributes.arrayPaths.push(...newAttributes.arrayPaths);
                allAttributes.objectPaths.push(...newAttributes.objectPaths);
                allAttributes.attributes = _uniq(allAttributes.attributes).sort((a, b) => {
                    return a.localeCompare(b);
                });
                allAttributes.objectPaths = _uniq(allAttributes.objectPaths).sort((a, b) => {
                    return b.split('._.').length - a.split('._.').length;
                });
                allAttributes.arrayPaths = _uniq(allAttributes.arrayPaths);

                //fs.writeFileSync(exportJsonFileDirectory + '/' + interview.id + '__' + interview.uuid + '.json', JSON.stringify(responses));
                if (i % 1000 === 0) {
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
 * @returns An object where the keys are the objects to export and the values
 * are an array of path
 */
const getPathsByObject = async (): Promise<{ [objName: string]: string[] }> => {
    const paths = await getRenamedPaths();

    const pathsByObject = {
        interview: ['hasValidatedData']
    };

    for (let i = 0, count = paths.objectPaths.length; i < count; i++) {
        const objectPath = paths.objectPaths[i];
        pathsByObject[objectPath] = [];
    }

    for (let i = 0, count = paths.attributes.length; i < count; i++) {
        let foundObjectPath = false;
        const attribute = paths.attributes[i];
        let attributeNamespace = '';
        for (let j = 0; j < paths.objectPaths.length; j++) {
            const objectPath = paths.objectPaths[j];
            if (attribute.startsWith(objectPath) && objectPath.length > attributeNamespace.length) {
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

const innerExportAllToCsvByObject = async function () {
    const pathsByObject = await getPathsByObject();

    const exportedDataByObjectPath: any = {};
    for (const objectPath in pathsByObject) {
        exportedDataByObjectPath[objectPath] = {};
        for (let i = 0, count = pathsByObject[objectPath].length; i < count; i++) {
            if (objectPath !== 'interview') {
                exportedDataByObjectPath[objectPath]._parentUuid = undefined;
            } else {
                exportedDataByObjectPath[objectPath]._interviewUuid = undefined;
            }
            exportedDataByObjectPath[objectPath][pathsByObject[objectPath][i].replace(objectPath + '._.', '')] =
                undefined;
        }
    }

    // create csv files and streams:
    const csvFilePathByObjectPath: {
        [objectName: string]: fs.WriteStream;
    } = {};
    const wroteHeaderByObjectPath = {};
    const csvFilePaths: string[] = [];
    for (const objectPath in pathsByObject) {
        const csvFilePath = `${filePathOnServer}/` + objectPath.replaceAll('._.', '_').replaceAll('.', '_') + '.csv';
        const csvStream = fs.createWriteStream(fileManager.getAbsolutePath(csvFilePath));
        csvStream.on('error', console.error);
        csvFilePathByObjectPath[objectPath] = csvStream;
        csvFilePaths.push(csvFilePath);
        wroteHeaderByObjectPath[objectPath] = false;
    }

    console.log('reading interview data...');

    const queryStream = interviewsDbQueries.getInterviewsStream({
        filters: {},
        select: { includeAudits: false, responses: 'validatedIfAvailable' }
    });
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
                const exportedInterviewDataByObjectPath = _cloneDeep(exportedDataByObjectPath);

                const interviewPaths = getPaths('', responses, undefined);
                const objectsByObjectPath = {
                    interview: exportedInterviewDataByObjectPath.interview
                };
                objectsByObjectPath.interview.hasValidatedData = row.validated_data_available;
                objectsByObjectPath.interview._interviewUuid = interview.uuid;
                //console.log('interviewPaths', interviewPaths);

                for (let j = 0, countJ = interviewPaths.length; j < countJ; j++) {
                    const path = interviewPaths[j];
                    const pathUuid = getLastUuidFromPath(path);
                    const pathWithoutUuids = removeUuidsFromPath(path);
                    let foundObjectPath = false;
                    for (const objectPath in exportedInterviewDataByObjectPath) {
                        if (pathWithoutUuids.startsWith(objectPath)) {
                            if (!objectsByObjectPath[objectPath]) {
                                objectsByObjectPath[objectPath] = {};
                            }
                            if (!objectsByObjectPath[objectPath][pathUuid]) {
                                objectsByObjectPath[objectPath][pathUuid] = _cloneDeep(
                                    exportedInterviewDataByObjectPath[objectPath]
                                );
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
                            let value = _get(responses, path);
                            if (Array.isArray(value)) {
                                value = value.join('|');
                            }
                            objectsByObjectPath[objectPath][pathUuid][
                                pathWithoutUuids.replace(objectPath + '._.', '')
                            ] = value && isString(value) ? value.replace('\n', ' ') : value;
                            foundObjectPath = true;
                            break;
                        }
                    }
                    if (!foundObjectPath) {
                        let value = _get(responses, path);
                        if (Array.isArray(value)) {
                            value = value.join('|');
                        }
                        objectsByObjectPath.interview[pathWithoutUuids] =
                            value && isString(value) ? value.replace('\n', ' ') : value;
                    }
                }

                for (const objectPath in objectsByObjectPath) {
                    if (objectPath !== 'interview') {
                        for (const _uuid in objectsByObjectPath[objectPath]) {
                            csvFilePathByObjectPath[objectPath].write(
                                unparse([objectsByObjectPath[objectPath][_uuid]], {
                                    header: !wroteHeaderByObjectPath[objectPath]
                                }) + '\n'
                            );
                            wroteHeaderByObjectPath[objectPath] = true;
                        }
                    } else {
                        csvFilePathByObjectPath[objectPath].write(
                            unparse([objectsByObjectPath[objectPath]], {
                                header: !wroteHeaderByObjectPath[objectPath]
                            }) + '\n'
                        );
                        wroteHeaderByObjectPath[objectPath] = true;
                    }
                }

                if (i % 1000 === 0) {
                    console.log(`interview ${i + 1}`);
                }
                i++;
            })
            .on('end', () => {
                console.log('all interview paths generated');
                Object.keys(csvFilePathByObjectPath).forEach((object) => csvFilePathByObjectPath[object].end());
                resolve(csvFilePaths);
            });
    });
};

export const exportAllToCsvByObject = function () {
    if (runningExportNonce !== undefined) {
        return 'alreadyRunning';
    }
    runningExportNonce = new Object();
    innerExportAllToCsvByObject().finally(() => {
        runningExportNonce = undefined;
    });
    return 'exportStarted';
};

export const isExportRunning = () => runningExportNonce !== undefined;

export const getExportFiles = () => fileManager.directoryManager.getFiles(filePathOnServer);
