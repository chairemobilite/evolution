/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import Papa from 'papaparse';
import { ObjectReadableMock, ObjectWritableMock } from 'stream-mock';
import paradataDbQueries from '../../../models/paradataEvents.db.queries';

import { exportInterviewLogTask } from '../exportInterviewLogs';

// Mock the database log stream
jest.mock('../../../models/paradataEvents.db.queries', () => ({
    getParadataStream: jest.fn().mockImplementation(() => new ObjectReadableMock([]))
}));
// FIXME Fix this function when interview logs are back
const mockGetInterviewLogsStream = paradataDbQueries.getParadataStream as jest.MockedFunction<typeof paradataDbQueries.getParadataStream>;

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

describe('exportInterviewLogTask', () => {

    // Common data for all logs of the interview
    const commonInterviewData = { id: 1, uuid: 'uuid',  'updated_at': '2024-10-11 09:02:00', is_valid: true, is_completed: true, is_validated: null, is_questionable: null, user_id: null };
    const commonInterviewDataInRows = { id: '1', uuid: 'uuid',  'updated_at': '2024-10-11 09:02:00', is_valid: 'true', is_completed: 'true', is_validated: '', is_questionable: '', user_id: '' };

    const logs: { [key: string]: any }[] = [
        {
            // Normal log with a bit of everything, including null values
            ...commonInterviewData,
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'responses.home.geography': { type: 'Point', coordinates: [ 1, 1 ]}, 'validations.home.geography': true, 'responses.household.size': 3, 'responses._activeTripId': null },
            unset_paths: [ 'responses.home.someField', 'validations.home.someField' ]
        }, {
            // No unset paths
            ...commonInterviewData,
            timestamp_sec: 2,
            event_date: new Date(2 * 1000),
            values_by_path: { 'responses.home.address': 'somewhere over the rainbow', 'validations.home.address': true },
        }, {
            // Unset paths, but empty values_by_path
            ...commonInterviewData,
            timestamp_sec: 3,
            event_date: new Date(3 * 1000),
            values_by_path: {},
            unset_paths: [ 'responses.home.address', 'validations.home.address' ]
        }, {
            // No participant responses in values_by_path
            ...commonInterviewData,
            timestamp_sec: 4,
            event_date: new Date(4 * 1000),
            values_by_path: { 'validations.home.region': true, 'validations.home.country': true },
            unset_paths: [ 'responses.home.region', 'responses.home.country' ]
        }, {
            // No participant responses in unset_paths
            ...commonInterviewData,
            timestamp_sec: 5,
            event_date: new Date(5 * 1000),
            values_by_path: { 'responses.household.carNumber': 1, 'responses.household.bikeNumber': 10, 'validations.household.carNumber': false, 'validations.household.bikeNumber': true },
            unset_paths: [ 'validations.home.region', 'validation.home.country' ]
        }, {
            // No participant responses in values_by_path and unset_paths
            ...commonInterviewData,
            timestamp_sec: 6,
            event_date: new Date(6 * 1000),
            values_by_path: { 'validated_data.home.address': '6760 rue Saint-Vallier Montréal', 'validated_data.home.city': 'Montréal' },
            unset_paths: [ 'validated_data.home.country' ]
        }
    ];

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
    }

    test('Test default, all updates, no values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);
        
        const csvFileName = Object.keys(fileStreams).find(filename => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();
        
        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, but there can be multiple rows
        expect(csvStream.data.length).toEqual(logs.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        expect(logRows.length).toEqual(logs.length);

        // One row per log, with modified fields and unset fields for each
        for (let i = 0; i < logs.length; i++) {
            expect(logRows[i]).toEqual(expect.objectContaining({
                ...commonInterviewDataInRows
            }));
            const modifiedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value !== null).map(([key, value]) => key).join('|');
            const initializedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value === null).map(([key, value]) => key).join('|');
            expect(logRows[i].timestampMs).toEqual(String((i+1) * 1000));
            expect(logRows[i].event_date).toEqual(new Date((i+1) * 1000).toISOString());
            expect(logRows[i].modifiedFields).toEqual(modifiedKeys);
            expect(logRows[i].initializedFields).toEqual(initializedKeys);
            expect(logRows[i].unsetFields).toEqual(logs[i].unset_paths !== undefined ? logs[i].unset_paths.join('|') : '');
        }
    });

    test('Test only participant responses, no values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({ participantResponsesOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);
        
        const csvFileName = Object.keys(fileStreams).find(filename => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();
        
        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no responses, so it should be skipped
        expect(csvStream.data.length).toEqual(logs.length - 1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        expect(logRows.length).toEqual(logs.length - 1);

        // One row per log, with modified fields and unset fields for each
        for (let i = 0; i < logs.length - 1; i++) {
            expect(logRows[i]).toEqual(expect.objectContaining({
                ...commonInterviewDataInRows
            }));
            const modifiedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value !== null).filter(([key, value]) => key.startsWith('responses.')).map(([key, value]) => key).join('|');
            const initializedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value === null).filter(([key, value]) => key.startsWith('responses.')).map(([key, value]) => key).join('|');
            expect(logRows[i].timestampMs).toEqual(String((i+1) * 1000));
            expect(logRows[i].event_date).toEqual(new Date((i+1) * 1000).toISOString());
            expect(logRows[i].modifiedFields).toEqual(modifiedKeys);
            expect(logRows[i].initializedFields).toEqual(initializedKeys);
            expect(logRows[i].unsetFields).toEqual(logs[i].unset_paths !== undefined ? logs[i].unset_paths.filter(key => key.startsWith('responses.')).join('|') : '');
        }
    });

    test('Test all log data, with values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({ withValues: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);
        
        const csvFileName = Object.keys(fileStreams).find(filename => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();
        
        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, but there can be multiple rows
        expect(csvStream.data.length).toEqual(logs.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per values_by_path key-value pair, plus one row per unset path
        const expectedCount = logs.reduce((acc, log) => acc + Object.keys(log.values_by_path).length + (log.unset_paths || []).length, 0);
        expect(logRows.length).toEqual(expectedCount);

        // For each element in the logs, make sure there is a corresponding row in the data
        for (let i = 0; i < logs.length; i++) {
            const currentLog = logs[i];
            // Find a row for each value by path
            for (let [key, value] of Object.entries(currentLog.values_by_path)) {
                const foundRow = logRows.find(row => row.field === key && row.timestampMs === String((i+1) * 1000));
                expect(foundRow).toBeDefined();
                expect(foundRow).toEqual({
                    ...commonInterviewDataInRows,
                    timestampMs: String((i+1) * 1000),
                    event_date: new Date((i+1) * 1000).toISOString(),
                    field: key,
                    value: JSON.stringify(value)
                });
            }
            // Find a row for each unset path
            for (let path of currentLog.unset_paths || []) {
                const foundRow = logRows.find(row => row.field === path && row.timestampMs === String((i+1) * 1000));
                expect(foundRow).toBeDefined();
                expect(foundRow).toEqual({
                    ...commonInterviewDataInRows,
                    timestampMs: String((i+1) * 1000),
                    event_date: new Date((i+1) * 1000).toISOString(),
                    field: path,
                    value: ''
                });
            }
        }
    });

    test('Test only participant responses, with values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({ withValues: true, participantResponsesOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);
        
        const csvFileName = Object.keys(fileStreams).find(filename => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();
        
        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no responses, so it should be skipped
        expect(csvStream.data.length).toEqual(logs.length - 1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per values_by_path key-value pair that is for the responses field, plus one row per unset path with responses field
        const expectedCount = logs.reduce((acc, log) => acc + Object.keys(log.values_by_path).filter(key => key.startsWith('responses.')).length + (log.unset_paths || []).filter(key => key.startsWith('responses.')).length, 0);
        expect(logRows.length).toEqual(expectedCount);

        // For each element in the logs, make sure there is a corresponding row in the data
        for (let i = 0; i < logs.length; i++) {
            const currentLog = logs[i];
            // Find a row for each value by path
            for (let [key, value] of Object.entries(currentLog.values_by_path)) {
                const foundRow = logRows.find(row => row.field === key && row.timestampMs === String((i+1) * 1000));
                if (key.startsWith('responses.')) {
                    expect(foundRow).toBeDefined();
                    expect(foundRow).toEqual({
                        ...commonInterviewDataInRows,
                        event_date: new Date((i+1) * 1000).toISOString(),
                        timestampMs: String((i+1) * 1000),
                        field: key,
                        value: JSON.stringify(value)
                    });
                } else {
                    expect(foundRow).toBeUndefined();
                }
            }
            // Find a row for each unset path
            for (let path of currentLog.unset_paths || []) {
                const foundRow = logRows.find(row => row.field === path && row.timestampMs === String((i+1) * 1000));
                if (path.startsWith('responses.')) {
                    expect(foundRow).toBeDefined();
                    expect(foundRow).toEqual({
                        ...commonInterviewDataInRows,
                        event_date: new Date((i+1) * 1000).toISOString(),
                        timestampMs: String((i+1) * 1000),
                        field: path,
                        value: ''
                    });
                } else {
                    expect(foundRow).toBeUndefined();
                }
                
            }
        }
    });

    test('Test with interview ID in parameter', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        // Request logs for a specific interview
        const interviewId = 3;
        const fileName = await exportInterviewLogTask({ interviewId });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(interviewId);
        
        // The data is already tested in other tests, checking the parameter of the stream is enough
    });

});