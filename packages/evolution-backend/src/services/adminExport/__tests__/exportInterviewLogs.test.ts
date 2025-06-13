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
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ]
        }, {
            // No unset paths
            ...commonInterviewData,
            timestamp_sec: 2,
            event_date: new Date(2 * 1000),
            values_by_path: { 'response.home.address': 'somewhere over the rainbow', 'validations.home.address': true },
        }, {
            // Unset paths, but empty values_by_path
            ...commonInterviewData,
            timestamp_sec: 3,
            event_date: new Date(3 * 1000),
            values_by_path: {},
            unset_paths: [ 'response.home.address', 'validations.home.address' ]
        }, {
            // No participant response in values_by_path
            ...commonInterviewData,
            timestamp_sec: 4,
            event_date: new Date(4 * 1000),
            values_by_path: { 'validations.home.region': true, 'validations.home.country': true },
            unset_paths: [ 'response.home.region', 'response.home.country' ]
        }, {
            // No participant response in unset_paths
            ...commonInterviewData,
            timestamp_sec: 5,
            event_date: new Date(5 * 1000),
            values_by_path: { 'response.household.carNumber': 1, 'response.household.bikeNumber': 10, 'validations.household.carNumber': false, 'validations.household.bikeNumber': true },
            unset_paths: [ 'validations.home.region', 'validation.home.country' ]
        }, {
            // No participant response in values_by_path and unset_paths
            ...commonInterviewData,
            timestamp_sec: 6,
            event_date: new Date(6 * 1000),
            values_by_path: { 'corrected_response.home.address': '6760 rue Saint-Vallier Montréal', 'corrected_response.home.city': 'Montréal' },
            unset_paths: [ 'corrected_response.home.country' ]
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
    };

    test('Test default, all updates, no values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
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
            expect(logRows[i].widgetType).toEqual('');
            expect(logRows[i].widgetPath).toEqual('');
        }
    });

    test('Test only participant response, no values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({ participantResponseOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no response, so it should be skipped
        expect(csvStream.data.length).toEqual(logs.length - 1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        expect(logRows.length).toEqual(logs.length - 1);

        // One row per log, with modified fields and unset fields for each
        for (let i = 0; i < logs.length - 1; i++) {
            expect(logRows[i]).toEqual(expect.objectContaining({
                ...commonInterviewDataInRows
            }));
            const modifiedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value !== null).filter(([key, value]) => key.startsWith('response.')).map(([key, value]) => key).join('|');
            const initializedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value === null).filter(([key, value]) => key.startsWith('response.')).map(([key, value]) => key).join('|');
            expect(logRows[i].timestampMs).toEqual(String((i+1) * 1000));
            expect(logRows[i].event_date).toEqual(new Date((i+1) * 1000).toISOString());
            expect(logRows[i].modifiedFields).toEqual(modifiedKeys);
            expect(logRows[i].initializedFields).toEqual(initializedKeys);
            expect(logRows[i].unsetFields).toEqual(logs[i].unset_paths !== undefined ? logs[i].unset_paths.filter((key) => key.startsWith('response.')).join('|') : '');
            expect(logRows[i].widgetType).toEqual('');
            expect(logRows[i].widgetPath).toEqual('');
        }
    });

    test('Test all log data, with values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({ withValues: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
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
            for (const [key, value] of Object.entries(currentLog.values_by_path)) {
                const foundRow = logRows.find((row) => row.field === key && row.timestampMs === String((i+1) * 1000));
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
            for (const path of currentLog.unset_paths || []) {
                const foundRow = logRows.find((row) => row.field === path && row.timestampMs === String((i+1) * 1000));
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

    test('Test only participant response, with values', async () => {
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

        const fileName = await exportInterviewLogTask({ withValues: true, participantResponseOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no response, so it should be skipped
        expect(csvStream.data.length).toEqual(logs.length - 1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per values_by_path key-value pair that is for the response field, plus one row per unset path with response field
        const expectedCount = logs.reduce((acc, log) => acc + Object.keys(log.values_by_path).filter((key) => key.startsWith('response.')).length + (log.unset_paths || []).filter((key) => key.startsWith('response.')).length, 0);
        expect(logRows.length).toEqual(expectedCount);

        // For each element in the logs, make sure there is a corresponding row in the data
        for (let i = 0; i < logs.length; i++) {
            const currentLog = logs[i];
            // Find a row for each value by path
            for (const [key, value] of Object.entries(currentLog.values_by_path)) {
                const foundRow = logRows.find((row) => row.field === key && row.timestampMs === String((i+1) * 1000));
                if (key.startsWith('response.')) {
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
            for (const path of currentLog.unset_paths || []) {
                const foundRow = logRows.find((row) => row.field === path && row.timestampMs === String((i+1) * 1000));
                if (path.startsWith('response.')) {
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

    test('Test with an event of type widget_interaction with user action', async () => {
        // Just add one log statement to test the widget_interaction event:
        const userAction = { type: 'widgetInteraction', path: 'response.someField', value: 'someValue', widgetType: 'radio' };
        const log = {
            ...commonInterviewData,
            event_type: 'widget_interaction',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: userAction
        };
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock([log]) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no response, so it should be skipped
        expect(csvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be only one log
        expect(logRows.length).toEqual(1);

        // Test the row values
        const currentLog = logRows[0];

        expect(currentLog).toEqual(expect.objectContaining({
            ...commonInterviewDataInRows,
            event_type: 'widget_interaction'
        }));
        const modifiedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value !== null).map(([key, value]) => key).join('|');
        const initializedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value === null).map(([key, value]) => key).join('|');
        expect(currentLog.timestampMs).toEqual(String((1) * 1000));
        expect(currentLog.event_date).toEqual(new Date((1) * 1000).toISOString());
        expect(currentLog.modifiedFields).toEqual(modifiedKeys);
        expect(currentLog.initializedFields).toEqual(initializedKeys);
        expect(currentLog.unsetFields).toEqual(log.unset_paths !== undefined ? log.unset_paths.join('|') : '');
        expect(currentLog.widgetType).toEqual(userAction.widgetType);
        expect(currentLog.widgetPath).toEqual(userAction.path);
    });

    test('Test with an event of type widget_interaction with user action, with values', async () => {
        // Just add one log statement to test the widget_interaction event:
        const userAction = { type: 'widgetInteraction', path: 'response.someField', value: 'someValue', widgetType: 'radio' };
        const log = {
            ...commonInterviewData,
            event_type: 'widget_interaction',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] } },
            unset_paths: [ 'response.home.someField' ],
            user_action: userAction
        };
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock([log]) as any);

        const fileName = await exportInterviewLogTask({ withValues: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no response, so it should be skipped
        expect(csvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per values_by_path key-value pair that is for the response field, plus one row per unset path with response field
        const expectedCount = Object.keys(log.values_by_path).length + (log.unset_paths || []).length;
        // And one additional row for the user action
        expect(logRows.length).toEqual(expectedCount + 1);

        // Find a row for each value by path
        for (const [key, value] of Object.entries(log.values_by_path)) {
            const foundRow = logRows.find((row) => row.field === key && row.timestampMs === String((1) * 1000));
            expect(foundRow).toBeDefined();
            expect(foundRow).toEqual({
                ...commonInterviewDataInRows,
                event_type: 'widget_interaction',
                timestampMs: String((1) * 1000),
                event_date: new Date((1) * 1000).toISOString(),
                field: key,
                value: JSON.stringify(value)
            });
        }
        // Find a row for each unset path
        for (const path of log.unset_paths || []) {
            const foundRow = logRows.find((row) => row.field === path && row.timestampMs === String((1) * 1000));
            expect(foundRow).toBeDefined();
            expect(foundRow).toEqual({
                ...commonInterviewDataInRows,
                event_type: 'widget_interaction',
                timestampMs: String((1) * 1000),
                event_date: new Date((1) * 1000).toISOString(),
                field: path,
                value: ''
            });
        }
        // Find a row for the user action
        const foundRow = logRows.find((row) => row.field === userAction.path && row.timestampMs === String((1) * 1000));
        expect(foundRow).toBeDefined();
        expect(foundRow).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'widget_interaction',
            timestampMs: String((1) * 1000),
            event_date: new Date((1) * 1000).toISOString(),
            field: userAction.path,
            value: JSON.stringify(userAction.value)
        });

    });

    test('Test with an event of type button_click with user action', async () => {
        // Just add one log statement to test the widget_interaction event:
        const userAction = { type: 'buttonClick', buttonId: 'response.someField' };
        const log = {
            ...commonInterviewData,
            event_type: 'button_click',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: userAction
        };
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock([log]) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no response, so it should be skipped
        expect(csvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be only one log
        expect(logRows.length).toEqual(1);

        // Test the row values
        const currentLog = logRows[0];

        expect(currentLog).toEqual(expect.objectContaining({
            ...commonInterviewDataInRows,
            event_type: 'button_click'
        }));
        const modifiedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value !== null).map(([key, value]) => key).join('|');
        const initializedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value === null).map(([key, value]) => key).join('|');
        expect(currentLog.timestampMs).toEqual(String((1) * 1000));
        expect(currentLog.event_date).toEqual(new Date((1) * 1000).toISOString());
        expect(currentLog.modifiedFields).toEqual(modifiedKeys);
        expect(currentLog.initializedFields).toEqual(initializedKeys);
        expect(currentLog.unsetFields).toEqual(log.unset_paths !== undefined ? log.unset_paths.join('|') : '');
        expect(currentLog.widgetType).toEqual('');
        expect(currentLog.widgetPath).toEqual(userAction.buttonId);
    });

    test('Test with an event of type section_change with user action', async () => {
        // Just add one log statement to test the widget_interaction event:
        const userAction = { type: 'sectionChange', targetSection: { sectionShortname: 'someSection' } };
        const log = {
            ...commonInterviewData,
            event_type: 'section_change',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: userAction
        };
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock([log]) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith(undefined);

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should one data per log, one log has no response, so it should be skipped
        expect(csvStream.data.length).toEqual(1);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be only one log
        expect(logRows.length).toEqual(1);

        // Test the row values
        const currentLog = logRows[0];

        expect(currentLog).toEqual(expect.objectContaining({
            ...commonInterviewDataInRows,
            event_type: 'section_change'
        }));
        const modifiedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value !== null).map(([key, value]) => key).join('|');
        const initializedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value === null).map(([key, value]) => key).join('|');
        expect(currentLog.timestampMs).toEqual(String((1) * 1000));
        expect(currentLog.event_date).toEqual(new Date((1) * 1000).toISOString());
        expect(currentLog.modifiedFields).toEqual(modifiedKeys);
        expect(currentLog.initializedFields).toEqual(initializedKeys);
        expect(currentLog.unsetFields).toEqual(log.unset_paths !== undefined ? log.unset_paths.join('|') : '');
        expect(currentLog.widgetType).toEqual('');
        expect(currentLog.widgetPath).toEqual(userAction.targetSection.sectionShortname);
    });

});
