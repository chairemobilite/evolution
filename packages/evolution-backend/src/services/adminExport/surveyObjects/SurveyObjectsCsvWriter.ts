/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import readline from 'readline';
import { once } from 'events';
import { pipeline } from 'stream/promises';
import { unparse } from 'papaparse';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import type { CsvRow } from './surveyObjectToCsvRow';

/** Project-relative directory of the temporary row files, deleted when the writer is closed */
const temporaryDirectory = 'exports/surveyObjectsExportRows';

/**
 * Texts that a spreadsheet would run as a formula: those starting with `=`,
 * `@`, a tab or a carriage return, and those starting with `+` or `-`,
 * unless only digits, spaces, dots, parentheses and hyphens follow. Signed
 * numbers and phone numbers are thus not formulas: they cannot call a
 * function, a spreadsheet can at most compute a number from them.
 */
const formulaTextPattern = /^[=@\t\r]|^[+-](?![\d\s().-]*$)/;

/**
 * Options of the CSV files. `escapeFormulae` adds an apostrophe before the
 * texts matching the pattern, as the exported texts are typed by
 * participants. Values that are numbers, like coordinates, are not changed.
 */
const csvOptions = { newline: '\n', quoteChar: '"', delimiter: ',', quotes: true, escapeFormulae: formulaTextPattern };

type RowsFile = {
    ndjsonPath: string;
    stream: fs.WriteStream;
    columns: Set<string>;
};

export type SurveyObjectsCsvWriterOptions = {
    /** Project-relative directory where to write the CSV files */
    outputDirectory: string;
    /** Prefix of the CSV file names, followed by the object type */
    fileNamePrefix: string;
    /**
     * Columns written first in the files that have them, in this order. The
     * other columns follow in alphabetical order.
     */
    leadingColumns: string[];
};

/**
 * Writer of one CSV file per survey object type, shared by all the
 * interviews of an export.
 *
 * As the columns vary between interviews (custom attributes), they are only
 * known once all rows are written. The rows are first written to temporary
 * newline-delimited JSON files while collecting the columns, then converted
 * to CSV when calling {@link SurveyObjectsCsvWriter.finish}.
 *
 * {@link SurveyObjectsCsvWriter.close} must be called when the writer is not
 * needed anymore, whether the export succeeded or not.
 */
export class SurveyObjectsCsvWriter {
    private readonly options: SurveyObjectsCsvWriterOptions;
    private readonly filesByObjectType: { [objectType: string]: RowsFile } = {};
    /** First error of a row file stream, thrown by the next call to the writer */
    private streamError: Error | undefined = undefined;

    /**
     * @param {SurveyObjectsCsvWriterOptions} options - Where and how to write the files
     */
    constructor(options: SurveyObjectsCsvWriterOptions) {
        this.options = options;
        // Start from an empty directory, in case a previous export was interrupted
        fileManager.directoryManager.deleteDirectory(temporaryDirectory);
        fileManager.directoryManager.createDirectoryIfNotExists(temporaryDirectory);
        fileManager.directoryManager.createDirectoryIfNotExists(options.outputDirectory);
    }

    private getFile(objectType: string): RowsFile {
        if (this.filesByObjectType[objectType] === undefined) {
            const ndjsonPath = fileManager.getAbsolutePath(`${temporaryDirectory}/${objectType}.ndjson`);
            const stream = fs.createWriteStream(ndjsonPath);
            // Without a listener, an error of the stream would stop the process
            stream.on('error', (error) => {
                this.streamError = this.streamError ?? error;
            });
            this.filesByObjectType[objectType] = { ndjsonPath, stream, columns: new Set() };
        }
        return this.filesByObjectType[objectType];
    }

    /**
     * Write a row to the file of an object type. Resolves once the row can
     * be buffered, so that the caller waits before writing more rows.
     *
     * @param {string} objectType - Type of the object, which names the file
     * @param {CsvRow} row - The row to write
     * @returns {Promise<void>}
     * @throws The error of a previous write, if any
     */
    async writeRow(objectType: string, row: CsvRow): Promise<void> {
        if (this.streamError !== undefined) {
            throw this.streamError;
        }
        const file = this.getFile(objectType);
        Object.keys(row).forEach((column) => file.columns.add(column));
        if (!file.stream.write(JSON.stringify(row) + '\n')) {
            await once(file.stream, 'drain');
        }
    }

    /** Get the columns of a file: the leading columns it has, then the others in alphabetical order */
    private getOrderedColumns(file: RowsFile): string[] {
        const { leadingColumns } = this.options;
        return [
            ...leadingColumns.filter((column) => file.columns.has(column)),
            ...[...file.columns].filter((column) => !leadingColumns.includes(column)).sort()
        ];
    }

    private async endRowStreams(): Promise<void> {
        for (const { stream } of Object.values(this.filesByObjectType)) {
            if (!stream.writableEnded) {
                await new Promise<void>((resolve) => stream.end(() => resolve()));
            }
        }
    }

    /**
     * Delete the CSV files of a previous export that this export did not
     * write again. They would otherwise be listed with the files of this
     * export, without anything telling them apart.
     *
     * @param {string[]} writtenFileNames - Names of the files written by this export
     */
    private deleteFilesOfPreviousExport(writtenFileNames: string[]): void {
        const { outputDirectory, fileNamePrefix } = this.options;
        (fileManager.directoryManager.getFiles(outputDirectory) || [])
            .filter(
                (fileName) =>
                    fileName.startsWith(`${fileNamePrefix}_`) &&
                    fileName.endsWith('.csv') &&
                    !writtenFileNames.includes(fileName)
            )
            .forEach((fileName) => fileManager.deleteFile(`${outputDirectory}/${fileName}`));
    }

    /**
     * Convert the rows of each object type to a CSV file, and delete the
     * files of a previous export for the object types that have no rows in
     * this one. Must be called once, after all interviews are written.
     *
     * @returns {Promise<string[]>} The names of the CSV files, in the output directory
     * @throws The error of a previous write, if any
     */
    async finish(): Promise<string[]> {
        await this.endRowStreams();
        if (this.streamError !== undefined) {
            throw this.streamError;
        }
        const fileNames: string[] = [];
        for (const [objectType, file] of Object.entries(this.filesByObjectType)) {
            const fileName = `${this.options.fileNamePrefix}_${objectType}.csv`;
            await convertNdjsonToCsv(
                file.ndjsonPath,
                fileManager.getAbsolutePath(`${this.options.outputDirectory}/${fileName}`),
                this.getOrderedColumns(file)
            );
            fileNames.push(fileName);
        }
        this.deleteFilesOfPreviousExport(fileNames);
        return fileNames;
    }

    /**
     * Close the temporary row files and delete them. Can be called more than
     * once, and whether {@link SurveyObjectsCsvWriter.finish} was called or not.
     *
     * @returns {Promise<void>}
     */
    async close(): Promise<void> {
        await this.endRowStreams();
        fileManager.directoryManager.deleteDirectory(temporaryDirectory);
    }
}

/**
 * Write the rows of a newline-delimited JSON file to a CSV file, with the
 * given columns. Values missing from a row are left empty.
 */
const convertNdjsonToCsv = (ndjsonPath: string, csvPath: string, columns: string[]): Promise<void> =>
    pipeline(async function* () {
        const ndjsonStream = fs.createReadStream(ndjsonPath);
        try {
            yield unparse([columns], csvOptions) + '\n';
            for await (const line of readline.createInterface({ input: ndjsonStream })) {
                const row: CsvRow = JSON.parse(line);
                yield unparse([columns.map((column) => row[column])], csvOptions) + '\n';
            }
        } finally {
            // Closing the readline interface does not always close its input,
            // when the conversion stops before the end of the file
            ndjsonStream.destroy();
        }
    }, fs.createWriteStream(csvPath));
