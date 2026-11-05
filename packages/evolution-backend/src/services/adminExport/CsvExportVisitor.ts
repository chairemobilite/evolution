/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import readline from 'readline';
import { once } from 'events';
import { unparse } from 'papaparse';
import type {
    SurveyObjectVisitor,
    SurveyObjectVisitContext
} from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import { CsvRow, ExportableSurveyObject, surveyObjectToCsvRow } from './surveyObjectToCsvRow';

/**
 * Parent of each exported object type. The uuid of the parent is written in a
 * `_<parentType>Uuid` column, to link the rows of the files together. The
 * interview uuid is written for all objects, in the `_interviewUuid` column.
 */
const parentObjectTypeByObjectType = {
    interview: undefined,
    home: 'interview',
    household: 'interview',
    person: 'household',
    journey: 'person',
    visitedPlace: 'journey',
    trip: 'journey',
    segment: 'trip'
} as const;

type ExportedObjectType = keyof typeof parentObjectTypeByObjectType;

/**
 * Get the columns written first in the file of an object type, in this order,
 * to identify the object and link it to its interview and parent
 */
const getIdColumns = (objectType: ExportedObjectType): string[] => {
    const parentObjectType = parentObjectTypeByObjectType[objectType];
    return parentObjectType === undefined || parentObjectType === 'interview'
        ? ['_uuid', '_interviewUuid']
        : ['_uuid', '_interviewUuid', `_${parentObjectType}Uuid`];
};

/** Project-relative directory of the temporary row files, emptied when the export finishes */
const temporaryDirectory = 'exports/surveyObjectsExportRows';

type ObjectRowsFile = {
    ndjsonPath: string;
    stream: fs.WriteStream;
    idColumns: string[];
    columns: Set<string>;
};

/** A survey object, with its uuid */
type VisitedObject = ExportableSurveyObject & { uuid?: string };

/**
 * Visitor writing one CSV file per survey object type, with one row per
 * object. Each row contains the attributes and custom attributes of the
 * object, the uuid of its interview and the uuid of its parent object.
 *
 * As custom attributes vary between interviews, the columns are only known
 * once all objects are visited. The rows are first written to temporary
 * newline-delimited JSON files while collecting the columns, then converted
 * to CSV when calling {@link CsvExportVisitor.finish}.
 */
export class CsvExportVisitor implements SurveyObjectVisitor {
    private readonly filesByObjectType: { [objectType: string]: ObjectRowsFile } = {};

    /**
     * @param {string} outputDirectory - Project-relative directory where to write the CSV files
     * @param {string} fileNamePrefix - Prefix of the CSV file names, followed by the object type
     */
    constructor(
        private readonly outputDirectory: string,
        private readonly fileNamePrefix: string
    ) {
        // Start from an empty directory, in case a previous export was interrupted
        fileManager.directoryManager.deleteDirectory(temporaryDirectory);
        fileManager.directoryManager.createDirectoryIfNotExists(temporaryDirectory);
        fileManager.directoryManager.createDirectoryIfNotExists(outputDirectory);
    }

    visitInterview = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.writeRow('interview', object, context);
    visitHome = (object: VisitedObject, context: SurveyObjectVisitContext) => this.writeRow('home', object, context);
    visitHousehold = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.writeRow('household', object, context);
    visitPerson = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.writeRow('person', object, context);
    visitJourney = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.writeRow('journey', object, context);
    // The location of a visited place is in its composed place, exported in the same row
    visitVisitedPlace = (
        object: VisitedObject & { place?: ExportableSurveyObject },
        context: SurveyObjectVisitContext
    ) => this.writeRow('visitedPlace', object, context, object.place);
    visitTrip = (object: VisitedObject, context: SurveyObjectVisitContext) => this.writeRow('trip', object, context);
    visitSegment = (object: VisitedObject, context: SurveyObjectVisitContext) =>
        this.writeRow('segment', object, context);

    private getFile(objectType: ExportedObjectType): ObjectRowsFile {
        if (this.filesByObjectType[objectType] === undefined) {
            const ndjsonPath = fileManager.getAbsolutePath(`${temporaryDirectory}/${objectType}.ndjson`);
            const idColumns = getIdColumns(objectType);
            this.filesByObjectType[objectType] = {
                ndjsonPath,
                stream: fs.createWriteStream(ndjsonPath),
                idColumns,
                columns: new Set(idColumns)
            };
        }
        return this.filesByObjectType[objectType];
    }

    private async writeRow(
        objectType: ExportedObjectType,
        object: VisitedObject,
        context: SurveyObjectVisitContext,
        place?: ExportableSurveyObject
    ): Promise<void> {
        const parentObjectType = parentObjectTypeByObjectType[objectType];
        const row: CsvRow = {
            ...surveyObjectToCsvRow(object),
            ...(place ? surveyObjectToCsvRow(place, 'place') : {}),
            _uuid: object.uuid,
            _interviewUuid: context.interview.uuid
        };
        if (parentObjectType !== undefined && parentObjectType !== 'interview') {
            row[`_${parentObjectType}Uuid`] = context[parentObjectType]?.uuid;
        }
        const file = this.getFile(objectType);
        Object.keys(row).forEach((column) => file.columns.add(column));
        if (!file.stream.write(JSON.stringify(row) + '\n')) {
            // Wait for the buffer to be flushed before visiting more objects
            await once(file.stream, 'drain');
        }
    }

    /**
     * Convert the rows of each object type to a CSV file, then delete the
     * temporary files. Must be called once, after all interviews are visited.
     *
     * @returns {Promise<string[]>} The names of the CSV files, in the output directory
     */
    async finish(): Promise<string[]> {
        const fileNames: string[] = [];
        for (const [objectType, file] of Object.entries(this.filesByObjectType)) {
            await new Promise<void>((resolve) => file.stream.end(() => resolve()));
            const fileName = `${this.fileNamePrefix}_${objectType}.csv`;
            await convertNdjsonToCsv(
                file.ndjsonPath,
                fileManager.getAbsolutePath(`${this.outputDirectory}/${fileName}`),
                [...file.idColumns, ...[...file.columns].filter((column) => !file.idColumns.includes(column)).sort()]
            );
            fileNames.push(fileName);
        }
        fileManager.directoryManager.deleteDirectory(temporaryDirectory);
        return fileNames;
    }
}

/**
 * Write the rows of a newline-delimited JSON file to a CSV file, with the
 * given columns. Values missing from a row are left empty.
 */
const convertNdjsonToCsv = async (ndjsonPath: string, csvPath: string, columns: string[]): Promise<void> => {
    const csvStream = fs.createWriteStream(csvPath);
    const csvOptions = { newline: '\n', quoteChar: '"', delimiter: ',', quotes: true };
    csvStream.write(unparse([columns], csvOptions) + '\n');
    for await (const line of readline.createInterface({ input: fs.createReadStream(ndjsonPath) })) {
        const row: CsvRow = JSON.parse(line);
        if (!csvStream.write(unparse([columns.map((column) => row[column])], csvOptions) + '\n')) {
            await once(csvStream, 'drain');
        }
    }
    await new Promise<void>((resolve) => csvStream.end(() => resolve()));
};
