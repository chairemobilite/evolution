/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import Papa from 'papaparse';
import { ObjectReadableMock, ObjectWritableMock } from 'stream-mock';
import interviewsDbQueries from '../../../models/interviews.db.queries';

import { exportAllToCsvBySurveyObjectTask } from '../exportAllToCsvBySurveyObject';

// Mock the database log stream
jest.mock('../../../models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn().mockImplementation(() => new ObjectReadableMock([]))
}));
const mockGetInterviewsStream = interviewsDbQueries.getInterviewsStream as jest.MockedFunction<typeof interviewsDbQueries.getInterviewsStream>;

// Mock the csv file stream
let fileStreams: {[key: string]: ObjectWritableMock } = {};
const mockCreateStream = jest.fn().mockImplementation((filename: string) => {
    fileStreams[filename] = new ObjectWritableMock();
    return fileStreams[filename];
});

jest.mock('fs', () => {
    // Require the original module to not be mocked...
    const originalModule = jest.requireActual('fs');

    return {
        ...originalModule,
        createWriteStream: (fileName: string) => mockCreateStream(fileName)
    };
});

beforeEach(() => {
    fileStreams = {};
    jest.clearAllMocks();
});

describe('exportAllToCsvBySurveyObject', () => {

    const getCsvFileRows = (csvData: string[]): Promise<any[]> => {
        const input = csvData.join('');
        const rows: any[] = [];
        return new Promise((resolve, reject) => {
            Papa.parse(input, {
                header: true,
                skipEmptyLines: 'greedy',
                step: (row) => {
                    rows.push(row.data);
                },
                error: (error, file) => {
                    console.error('error parsing file', error, file);
                    if (error.row && error.message) {
                        reject(`error reading CSV file: ${file} on line ${error.row}: ${error.message}`);
                    } else {
                        reject(error);
                    }
                },
                complete: () => {
                    resolve(rows);
                }
            });
        });
    };

    test('Test with a simple interview data, with one nested object', async () => {
        const person1Uuid = uuidV4();
        // Very simple interview data
        const interviewData = {
            id: 1,
            uuid: uuidV4(),
            'updated_at': '2024-10-11 09:02:00',
            is_valid: true,
            is_completed: true,
            is_validated: null,
            is_questionable: null,
            response: {
                household: {
                    size: 1,
                    persons: {
                        [person1Uuid]: {
                            _uuid: person1Uuid,
                            age: 30
                        }
                    },
                    personsDidTrips: [person1Uuid]
                },
                arrayOfObjects: [{ a: 1, b: 2 }, { a: 3, b: 4 }],
                arrayOfStrings: ['a', 'b', 'c'],
            },
            corrected_response_available: true,
        };

        // Add the interview to the stream twice, for the paths and the export
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock([interviewData]) as any);
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock([interviewData]) as any);

        await exportAllToCsvBySurveyObjectTask({ responseType: 'correctedIfAvailable' });

        // Check the file content of the exported files, there should be one file for persons, one for the interview
        expect(mockCreateStream).toHaveBeenCalledTimes(2);
        expect(mockGetInterviewsStream).toHaveBeenCalledTimes(2);
        expect(mockGetInterviewsStream).toHaveBeenCalledWith({ filters: {}, select: { includeAudits: false, includeInterviewerData: true, responseType: 'correctedIfAvailable' } });

        // Check the content of the interview file
        const interviewCsvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith('corrected_interview_test.csv'));
        expect(interviewCsvFileName).toBeDefined();

        const csvStream = fileStreams[interviewCsvFileName as string];
        expect(csvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const interviewRows = await getCsvFileRows(csvStream.data);
        expect(interviewRows.length).toEqual(1);

        expect(interviewRows[0]).toEqual({
            _interviewUuid: interviewData.uuid,
            _interviewer_count: '',
            _interviewer_created: '',
            hasCorrectedResponse: 'true',
            'household.size': String(interviewData.response.household.size),
            is_completed: String(interviewData.is_completed),
            is_questionable: '',
            is_valid: String(interviewData.is_valid),
            is_validated: '',
            'arrayOfObjects.0.a': String(interviewData.response.arrayOfObjects[0].a),
            'arrayOfObjects.0.b': String(interviewData.response.arrayOfObjects[0].b),
            'arrayOfObjects.1.a': String(interviewData.response.arrayOfObjects[1].a),
            'arrayOfObjects.1.b': String(interviewData.response.arrayOfObjects[1].b),
            'arrayOfStrings': interviewData.response.arrayOfStrings.join('|'),
            'household.personsDidTrips': person1Uuid
        });

        // Check the content of the persons file
        const personsCsvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith('corrected_household_persons_test.csv'));
        expect(personsCsvFileName).toBeDefined();

        const personsCsvStream = fileStreams[personsCsvFileName as string];
        expect(personsCsvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const personsRows = await getCsvFileRows(personsCsvStream.data);
        console.log('personsRows', personsRows);
        expect(personsRows.length).toEqual(1);

        expect(personsRows[0]).toEqual({
            _interviewUuid: interviewData.uuid,
            _parentUuid: interviewData.uuid,
            _uuid: person1Uuid,
            age: String(interviewData.response.household.persons[person1Uuid].age),
        });
    });

    test('Test one interview with many levels of multiple nested objects and geography coordinates', async () => {
        const person1Uuid = uuidV4();
        const person2Uuid = uuidV4();
        const visitedPlace1P1Uuid = uuidV4();
        const visitedPlace1P2Uuid = uuidV4();
        const visitedPlace2P2Uuid = uuidV4();
        // Very simple interview data
        const interviewData = {
            id: 1,
            uuid: uuidV4(),
            'updated_at': '2024-10-11 09:02:00',
            is_valid: true,
            is_completed: true,
            is_validated: null,
            is_questionable: null,
            response: {
                household: {
                    size: 1,
                    persons: {
                        [person1Uuid]: {
                            _uuid: person1Uuid,
                            age: 30,
                            visitedPlaces: {
                                [visitedPlace1P1Uuid]: {
                                    _uuid: visitedPlace1P1Uuid,
                                    name: 'Place 1',
                                    geography: {
                                        type: 'Feature',
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [1, 2]
                                        },
                                        properties: {
                                            action: 'mapClicked'
                                        }
                                    }
                                }
                            }
                        },
                        [person2Uuid]: {
                            _uuid: person2Uuid,
                            age: 25,
                            nickname: 'P2',
                            visitedPlaces: {
                                [visitedPlace1P2Uuid]: {
                                    _uuid: visitedPlace1P2Uuid,
                                    name: 'Place 1',
                                    geography: {
                                        type: 'Feature',
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [1, 2]
                                        },
                                        properties: {
                                            action: 'mapClicked'
                                        }
                                    }
                                },
                                [visitedPlace2P2Uuid]: {
                                    _uuid: visitedPlace2P2Uuid,
                                    name: 'Place 2',
                                    geography: {
                                        type: 'Feature',
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [1, 2]
                                        },
                                        properties: {
                                            action: 'mapClicked'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    personsDidTrips: [person1Uuid, person2Uuid]
                }
            },
            corrected_response_available: true,
        };

        // Add the interview to the stream twice, for the paths and the export
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock([interviewData]) as any);
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock([interviewData]) as any);

        const filenames = await exportAllToCsvBySurveyObjectTask({ responseType: 'correctedIfAvailable' });
        console.log('filenames', filenames);

        // Check the file content of the exported files, there should be one file for persons, one for the interview
        expect(mockCreateStream).toHaveBeenCalledTimes(3);
        expect(mockGetInterviewsStream).toHaveBeenCalledTimes(2);
        expect(mockGetInterviewsStream).toHaveBeenCalledWith({ filters: {}, select: { includeAudits: false, includeInterviewerData: true, responseType: 'correctedIfAvailable' } });

        // Check the content of the interview file
        const interviewCsvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith('corrected_interview_test.csv'));
        expect(interviewCsvFileName).toBeDefined();

        const csvStream = fileStreams[interviewCsvFileName as string];
        expect(csvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const interviewRows = await getCsvFileRows(csvStream.data);
        expect(interviewRows.length).toEqual(1);

        expect(interviewRows[0]).toEqual({
            _interviewUuid: interviewData.uuid,
            _interviewer_count: '',
            _interviewer_created: '',
            hasCorrectedResponse: 'true',
            'household.size': String(interviewData.response.household.size),
            is_completed: String(interviewData.is_completed),
            is_questionable: '',
            is_valid: String(interviewData.is_valid),
            is_validated: '',
            'household.personsDidTrips': [person1Uuid, person2Uuid].join('|')
        });

        // Check the content of the persons file
        const personsCsvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith('corrected_household_persons_test.csv'));
        expect(personsCsvFileName).toBeDefined();

        const personsCsvStream = fileStreams[personsCsvFileName as string];

        // Get the actual rows in the file data
        const personsRows = await getCsvFileRows(personsCsvStream.data);
        expect(personsRows.length).toEqual(2);

        expect(personsRows[0]).toEqual({
            _interviewUuid: interviewData.uuid,
            _parentUuid: interviewData.uuid,
            _uuid: person1Uuid,
            age: String(interviewData.response.household.persons[person1Uuid].age),
            nickname: ''
        });
        expect(personsRows[1]).toEqual({
            _interviewUuid: interviewData.uuid,
            _parentUuid: interviewData.uuid,
            _uuid: person2Uuid,
            age: String(interviewData.response.household.persons[person2Uuid].age),
            nickname: interviewData.response.household.persons[person2Uuid].nickname
        });

        // Check the content of the visited places file
        const visitedPlacesCsvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith('corrected_household_persons_visitedPlaces_test.csv'));
        expect(visitedPlacesCsvFileName).toBeDefined();

        const visitedPlacesCsvStream = fileStreams[visitedPlacesCsvFileName as string];

        // Get the actual rows in the file data
        const visitedPlacesRows = await getCsvFileRows(visitedPlacesCsvStream.data);
        expect(visitedPlacesRows.length).toEqual(3);

        expect(visitedPlacesRows[0]).toEqual({
            _interviewUuid: interviewData.uuid,
            _parentUuid: person1Uuid,
            _uuid: visitedPlace1P1Uuid,
            name: interviewData.response.household.persons[person1Uuid].visitedPlaces[visitedPlace1P1Uuid].name,
            'geography.type': interviewData.response.household.persons[person1Uuid].visitedPlaces[visitedPlace1P1Uuid].geography.type,
            'geography.properties.action': interviewData.response.household.persons[person1Uuid].visitedPlaces[visitedPlace1P1Uuid].geography.properties.action,
            'geography.geometry.type': interviewData.response.household.persons[person1Uuid].visitedPlaces[visitedPlace1P1Uuid].geography.geometry.type,
            'geography.geometry.lat': String(interviewData.response.household.persons[person1Uuid].visitedPlaces[visitedPlace1P1Uuid].geography.geometry.coordinates[1]),
            'geography.geometry.lon': String(interviewData.response.household.persons[person1Uuid].visitedPlaces[visitedPlace1P1Uuid].geography.geometry.coordinates[0]),
        });
        expect(visitedPlacesRows[1]).toEqual({
            _interviewUuid: interviewData.uuid,
            _parentUuid: person2Uuid,
            _uuid: visitedPlace1P2Uuid,
            name: interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace1P2Uuid].name,
            'geography.type': interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace1P2Uuid].geography.type,
            'geography.properties.action': interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace1P2Uuid].geography.properties.action,
            'geography.geometry.type': interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace1P2Uuid].geography.geometry.type,
            'geography.geometry.lat': String(interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace1P2Uuid].geography.geometry.coordinates[1]),
            'geography.geometry.lon': String(interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace1P2Uuid].geography.geometry.coordinates[0]),
        });
        expect(visitedPlacesRows[2]).toEqual({
            _interviewUuid: interviewData.uuid,
            _parentUuid: person2Uuid,
            _uuid: visitedPlace2P2Uuid,
            name: interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace2P2Uuid].name,
            'geography.type': interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace2P2Uuid].geography.type,
            'geography.properties.action': interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace2P2Uuid].geography.properties.action,
            'geography.geometry.type': interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace2P2Uuid].geography.geometry.type,
            'geography.geometry.lat': String(interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace2P2Uuid].geography.geometry.coordinates[1]),
            'geography.geometry.lon': String(interviewData.response.household.persons[person2Uuid].visitedPlaces[visitedPlace2P2Uuid].geography.geometry.coordinates[0]),
        });

    });

    test('Test multiple interviews with divergent response fields', async () => {
        // Very simple interview data
        const interviewData = [{
            id: 1,
            uuid: uuidV4(),
            'updated_at': '2024-10-11 09:02:00',
            is_valid: true,
            is_completed: true,
            is_validated: null,
            is_questionable: null,
            response: {
                arrayOfObjectsIn1Only: [{ a: 1, b: 2 }, { a: 3, b: 4 }],
                arrayOfStrings: ['a', 'b', 'c'],
                arrayOrString: 'string'
            },
            corrected_response_available: true,
        }, {
            id: 2,
            uuid: uuidV4(),
            'updated_at': '2024-10-11 09:02:00',
            is_valid: true,
            is_completed: true,
            is_validated: null,
            is_questionable: null,
            response: {
                arrayOfStrings: ['d', 'e', 'c'],
                arrayOrString: ['an', 'array'],
                fieldIn2: 2,
                arrayIn2Only: ['x']
            },
            corrected_response_available: true,
        }];

        // Add the interview to the stream twice, for the paths and the export
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock(interviewData) as any);
        mockGetInterviewsStream.mockReturnValueOnce(new ObjectReadableMock(interviewData) as any);

        await exportAllToCsvBySurveyObjectTask({ responseType: 'correctedIfAvailable' });

        // Check the file content of the exported files, there should be one file for persons, one for the interview
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewsStream).toHaveBeenCalledTimes(2);
        expect(mockGetInterviewsStream).toHaveBeenCalledWith({ filters: {}, select: { includeAudits: false, includeInterviewerData: true, responseType: 'correctedIfAvailable' } });

        // Check the content of the interview file
        const interviewCsvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith('corrected_interview_test.csv'));
        expect(interviewCsvFileName).toBeDefined();

        const csvStream = fileStreams[interviewCsvFileName as string];

        // Get the actual rows in the file data
        const interviewRows = await getCsvFileRows(csvStream.data);
        expect(interviewRows.length).toEqual(2);

        expect(interviewRows[0]).toEqual({
            _interviewUuid: interviewData[0].uuid,
            _interviewer_count: '',
            _interviewer_created: '',
            hasCorrectedResponse: 'true',
            is_completed: String(interviewData[0].is_completed),
            is_questionable: '',
            is_valid: String(interviewData[0].is_valid),
            is_validated: '',
            'arrayOfObjectsIn1Only.0.a': String(interviewData[0].response.arrayOfObjectsIn1Only![0].a),
            'arrayOfObjectsIn1Only.0.b': String(interviewData[0].response.arrayOfObjectsIn1Only![0].b),
            'arrayOfObjectsIn1Only.1.a': String(interviewData[0].response.arrayOfObjectsIn1Only![1].a),
            'arrayOfObjectsIn1Only.1.b': String(interviewData[0].response.arrayOfObjectsIn1Only![1].b),
            'arrayOfStrings': interviewData[0].response.arrayOfStrings.join('|'),
            'arrayOrString': 'string',
            fieldIn2: '',
            arrayIn2Only: ''
        });

        expect(interviewRows[1]).toEqual({
            _interviewUuid: interviewData[1].uuid,
            _interviewer_count: '',
            _interviewer_created: '',
            hasCorrectedResponse: 'true',
            is_completed: String(interviewData[1].is_completed),
            is_questionable: '',
            is_valid: String(interviewData[1].is_valid),
            is_validated: '',
            'arrayOfObjectsIn1Only.0.a': '',
            'arrayOfObjectsIn1Only.0.b': '',
            'arrayOfObjectsIn1Only.1.a': '',
            'arrayOfObjectsIn1Only.1.b': '',
            'arrayOfStrings': interviewData[1].response.arrayOfStrings.join('|'),
            'arrayOrString': (interviewData[1].response.arrayOrString as string[]).join('|'),
            fieldIn2: String(interviewData[1].response.fieldIn2),
            arrayIn2Only: interviewData[1].response.arrayIn2Only!.join('|'),
        });

    });

});
