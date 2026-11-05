/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { DirectoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import { SurveyObjectsCsvWriter } from '../SurveyObjectsCsvWriter';

const outputDirectory = 'exports/test';
const temporaryDirectory = 'exports/surveyObjectsExportRows';
const options = { outputDirectory, fileNamePrefix: 'surveyObjects', leadingColumns: ['_uuid', '_parentUuid'] };

// The project directory, where project-relative paths are resolved, is a temporary directory
let projectDirectory: string;
const readCsvLines = (fileName: string) =>
    fs.readFileSync(path.join(projectDirectory, outputDirectory, fileName), 'utf8').trim().split('\n');
const temporaryDirectoryExists = () => fs.existsSync(path.join(projectDirectory, temporaryDirectory));

beforeEach(() => {
    projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'surveyObjectsCsvWriterTest-'));
    jest.spyOn(DirectoryManager.prototype, 'projectDirectory', 'get').mockReturnValue(projectDirectory);
});

afterEach(() => {
    fs.rmSync(projectDirectory, { recursive: true, force: true });
});

describe('SurveyObjectsCsvWriter', () => {
    test('writes one file per object type, with the columns of all its rows', async () => {
        const writer = new SurveyObjectsCsvWriter(options);
        // The rows of an object type do not all have the same columns
        await writer.writeRow('person', { age: 30, _parentUuid: 'household1', _uuid: 'person1', custom1: 'a' });
        await writer.writeRow('person', { _uuid: 'person2', _parentUuid: 'household2', age: 40, custom2: 'b' });
        await writer.writeRow('household', { size: 2, _uuid: 'household1' });

        const fileNames = await writer.finish();
        await writer.close();

        expect(fileNames.sort()).toEqual(['surveyObjects_household.csv', 'surveyObjects_person.csv']);
        // Leading columns first, then the others in alphabetical order, missing values left empty
        expect(readCsvLines('surveyObjects_person.csv')).toEqual([
            '"_uuid","_parentUuid","age","custom1","custom2"',
            '"person1","household1","30","a",',
            '"person2","household2","40",,"b"'
        ]);
        // A file only has the leading columns of its rows
        expect(readCsvLines('surveyObjects_household.csv')).toEqual(['"_uuid","size"', '"household1","2"']);
    });

    test('writes no file when there are no rows', async () => {
        const writer = new SurveyObjectsCsvWriter(options);
        expect(await writer.finish()).toEqual([]);
        await writer.close();
        expect(fs.readdirSync(path.join(projectDirectory, outputDirectory))).toEqual([]);
    });

    test.each([
        { description: 'after finish', callFinish: true },
        { description: 'without finish', callFinish: false }
    ])('close deletes the temporary row files: $description', async ({ callFinish }) => {
        const writer = new SurveyObjectsCsvWriter(options);
        await writer.writeRow('person', { _uuid: 'person1' });
        expect(temporaryDirectoryExists()).toEqual(true);
        if (callFinish) {
            await writer.finish();
        }

        await writer.close();
        // Closing twice is allowed
        await writer.close();

        expect(temporaryDirectoryExists()).toEqual(false);
        expect(fs.readdirSync(path.join(projectDirectory, outputDirectory))).toEqual(
            callFinish ? ['surveyObjects_person.csv'] : []
        );
    });

    test('deletes the row files left by an interrupted export', async () => {
        const leftoverFile = path.join(projectDirectory, temporaryDirectory, 'person.ndjson');
        fs.mkdirSync(path.dirname(leftoverFile), { recursive: true });
        fs.writeFileSync(leftoverFile, '{"_uuid":"leftover"}\n');

        const writer = new SurveyObjectsCsvWriter(options);
        await writer.writeRow('person', { _uuid: 'person1' });
        await writer.finish();
        await writer.close();

        expect(readCsvLines('surveyObjects_person.csv')).toEqual(['"_uuid"', '"person1"']);
    });
});
