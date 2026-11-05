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
import { walkSurveyObjects } from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import { ParentSurveyObjects } from 'evolution-common/lib/services/baseObjects/types';
import { CsvExportVisitor } from '../CsvExportVisitor';

// Plain objects with the parts read by the walker and the visitor
const surveyObject = (uuid: string, attributes: object, customAttributes = {}, children = {}) => ({
    uuid,
    attributes: { _uuid: uuid, ...attributes },
    customAttributes,
    ...children
});

const createInterview = (index: number, personCustomAttributes: object) => {
    const segment = surveyObject(`segment${index}`, { mode: 'walk' });
    const trip = surveyObject(`trip${index}`, { _sequence: 1 }, {}, { segments: [segment] });
    const visitedPlace = surveyObject(
        `visitedPlace${index}`,
        { activity: 'home' },
        {},
        {
            place: surveyObject(`place${index}`, {
                geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73, 45] }, properties: {} }
            })
        }
    );
    const journey = surveyObject(`journey${index}`, {}, {}, { visitedPlaces: [visitedPlace], trips: [trip] });
    const person = surveyObject(`person${index}`, { age: 30 }, personCustomAttributes, { journeys: [journey] });
    return {
        interview: surveyObject(`interview${index}`, { accessCode: '1234' }),
        home: surveyObject(`home${index}`, { name: 'home' }),
        household: surveyObject(`household${index}`, { size: 1 }, {}, { members: [person] })
    } as unknown as ParentSurveyObjects;
};

describe('CsvExportVisitor', () => {
    // The project directory, where project-relative paths are resolved, is a temporary directory
    const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'csvExportVisitorTest-'));
    const outputDirectory = 'exports/test';
    let fileNames: string[];

    beforeAll(async () => {
        jest.spyOn(DirectoryManager.prototype, 'projectDirectory', 'get').mockReturnValue(projectDirectory);
        const visitor = new CsvExportVisitor(outputDirectory, 'surveyObjects');
        // The custom attributes differ between interviews, all must be columns of the file
        await walkSurveyObjects(createInterview(1, { custom1: 'a' }), visitor);
        await walkSurveyObjects(createInterview(2, { custom2: 'b' }), visitor);
        fileNames = await visitor.finish();
    });

    afterAll(() => {
        fs.rmSync(projectDirectory, { recursive: true, force: true });
    });

    test('deletes the temporary row files', () => {
        expect(fs.readdirSync(path.join(projectDirectory, 'exports'))).toEqual(['test']);
    });

    test('writes one file per object type', () => {
        expect(fileNames.sort()).toEqual(
            ['household', 'home', 'interview', 'journey', 'person', 'segment', 'trip', 'visitedPlace']
                .map((objectType) => `surveyObjects_${objectType}.csv`)
                .sort()
        );
    });

    // Missing values are left empty, without quotes
    test.each([
        {
            objectType: 'interview',
            expected: [
                '"_uuid","_interviewUuid","accessCode"',
                '"interview1","interview1","1234"',
                '"interview2","interview2","1234"'
            ]
        },
        {
            objectType: 'household',
            expected: [
                '"_uuid","_interviewUuid","size"',
                '"household1","interview1","1"',
                '"household2","interview2","1"'
            ]
        },
        {
            objectType: 'person',
            expected: [
                '"_uuid","_interviewUuid","_householdUuid","age","custom1","custom2"',
                '"person1","interview1","household1","30","a",',
                '"person2","interview2","household2","30",,"b"'
            ]
        },
        {
            objectType: 'visitedPlace',
            expected: [
                '"_uuid","_interviewUuid","_journeyUuid","activity","place._uuid","place.geography.geometry.lat","place.geography.geometry.lon","place.geography.geometry.type","place.geography.type"',
                '"visitedPlace1","interview1","journey1","home","place1","45","-73","Point","Feature"',
                '"visitedPlace2","interview2","journey2","home","place2","45","-73","Point","Feature"'
            ]
        },
        {
            objectType: 'segment',
            expected: [
                '"_uuid","_interviewUuid","_tripUuid","mode"',
                '"segment1","interview1","trip1","walk"',
                '"segment2","interview2","trip2","walk"'
            ]
        }
    ])('writes the rows of $objectType with their parent', ({ objectType, expected }) => {
        const content = fs.readFileSync(path.join(projectDirectory, outputDirectory, `surveyObjects_${objectType}.csv`), 'utf8');
        expect(content.trim().split('\n')).toEqual(expected);
    });
});
