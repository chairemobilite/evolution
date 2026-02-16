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
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

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
    const commonInterviewData = { id: 1, uuid: 'uuid',  'updated_at': '2024-10-11 09:02:00', is_valid: true, is_completed: true, is_validated: null, is_questionable: null, interview_is_completed: true, user_id: null };
    const commonInterviewDataInRows = { id: '1', uuid: 'uuid',  'updated_at': '2024-10-11 09:02:00', is_valid: 'true', is_completed: 'true', is_validated: '', is_questionable: '', interview_is_completed: 'true', user_id: '' };

    // Various logs to test different situations, the last one is not from the participant
    const logs: { [key: string]: any }[] = [
        {
            // Normal log with a bit of everything, including null values
            ...commonInterviewData,
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            for_correction: false
        }, {
            // No unset paths
            ...commonInterviewData,
            timestamp_sec: 2,
            event_date: new Date(2 * 1000),
            values_by_path: { 'response.home.address': 'somewhere over the rainbow', 'validations.home.address': true },
            for_correction: false
        }, {
            // Unset paths, but empty values_by_path
            ...commonInterviewData,
            timestamp_sec: 3,
            event_date: new Date(3 * 1000),
            values_by_path: {},
            unset_paths: [ 'response.home.address', 'validations.home.address' ],
            for_correction: false
        }, {
            // No participant response in values_by_path
            ...commonInterviewData,
            timestamp_sec: 4,
            event_date: new Date(4 * 1000),
            values_by_path: { 'validations.home.region': true, 'validations.home.country': true },
            unset_paths: [ 'response.home.region', 'response.home.country' ],
            for_correction: false
        }, {
            // No participant response in unset_paths
            ...commonInterviewData,
            timestamp_sec: 5,
            event_date: new Date(5 * 1000),
            values_by_path: { 'response.household.carNumber': 1, 'response.household.bikeNumber': 10, 'validations.household.carNumber': false, 'validations.household.bikeNumber': true },
            unset_paths: [ 'validations.home.region', 'validations.home.country' ],
            for_correction: false
        }, {
            // No participant response in values_by_path and unset_paths
            ...commonInterviewData,
            timestamp_sec: 6,
            event_date: new Date(6 * 1000),
            values_by_path: { 'corrected_response.home.address': '6760 rue Saint-Vallier Montréal', 'corrected_response.home.city': 'Montréal' },
            unset_paths: [ 'corrected_response.home.country' ],
            for_correction: true
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
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

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
            const modifiedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
            const initializedKeys = Object.entries(logs[i].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
            expect(logRows[i].timestampMs).toEqual(String((i+1) * 1000));
            expect(logRows[i].event_date).toEqual(new Date((i+1) * 1000).toISOString());
            expect(logRows[i].modifiedFields).toEqual(modifiedKeys);
            expect(logRows[i].initializedFields).toEqual(initializedKeys);
            expect(logRows[i].unsetFields).toEqual(logs[i].unset_paths !== undefined ? logs[i].unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '');
            expect(logRows[i].widgetType).toEqual('');
            expect(logRows[i].widgetPath).toEqual('');
        }
    });

    test('Test only participant response, no values', async () => {
        // Add the logs to the stream, only those with for_correction not true
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs.filter(log => log.for_correction !== true)) as any);

        const fileName = await exportInterviewLogTask({ participantResponseOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: false, interviewId: undefined });

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

    test('Test only participant response, no values, with `null` in `for_correction`', async () => {
        // Add the logs to the stream, but with `null` in `for_correction`
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs.map(log => ({ ...log, for_correction: null }))) as any);

        const fileName = await exportInterviewLogTask({ participantResponseOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: false, interviewId: undefined });

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
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

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
                    value: JSON.stringify(value),
                    for_correction: currentLog.for_correction ? 'true' : 'false'
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
                    value: '',
                    for_correction: currentLog.for_correction ? 'true' : 'false'
                });
            }
        }
    });

    test('Test only participant response, with values', async () => {
        // Add the logs to the stream, only those with for_correction not true
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs.filter(log => log.for_correction !== true)) as any);

        const fileName = await exportInterviewLogTask({ withValues: true, participantResponseOnly: true });

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: false, interviewId: undefined });

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
                        value: JSON.stringify(value),
                        for_correction: currentLog.for_correction ? 'true' : 'false'
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
                        value: '',
                        for_correction: currentLog.for_correction ? 'true' : 'false'
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
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId });

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
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

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
        const modifiedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeys = Object.entries(log.values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(currentLog.timestampMs).toEqual(String((1) * 1000));
        expect(currentLog.event_date).toEqual(new Date((1) * 1000).toISOString());
        expect(currentLog.modifiedFields).toEqual(modifiedKeys);
        expect(currentLog.initializedFields).toEqual(initializedKeys);
        expect(currentLog.unsetFields).toEqual(log.unset_paths !== undefined ? log.unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '');
        expect(currentLog.widgetType).toEqual(userAction.widgetType);
        expect(currentLog.widgetPath).toEqual(userAction.path);
        expect(currentLog.invalidFields).toEqual('');
        expect(currentLog.validFields).toEqual('home.geography');
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
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

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

    describe('Tests with button_click events', () => {
        const testCases = [
            {
                description: 'basic user action',
                userAction: { type: 'buttonClick', buttonId: 'response.someField' },
                values_by_path: {
                    'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] },
                    'response.household.size': 3,
                    'response._activeTripId': null
                },
                unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
                expectedOutput: {
                    hiddenWidgets: '',
                    invalidFields: ''
                }
            },
            {
                description: 'hidden widgets',
                userAction: { type: 'buttonClick', buttonId: 'response.otherField', hiddenWidgets: [ 'hiddenWidget1', 'hiddenWidget2' ] },
                values_by_path: { },
                unset_paths: undefined,
                expectedOutput: {
                    hiddenWidgets: 'hiddenWidget1|hiddenWidget2',
                    invalidFields: ''
                }
            },
            {
                description: 'invalid widgets in user action',
                userAction: { type: 'buttonClick', buttonId: 'response.otherField', invalidWidgets: [ 'invalidWidget1', 'invalidWidget2' ] },
                values_by_path: {
                    'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }
                },
                unset_paths: [ 'response.home.someField' ],
                expectedOutput: {
                    hiddenWidgets: '',
                    invalidFields: 'invalidWidget1|invalidWidget2'
                }
            },
            {
                description: 'invalid widgets in user action and values_by_path',
                userAction: { type: 'buttonClick', buttonId: 'response.otherField', invalidWidgets: [ 'invalidWidget1', 'invalidWidget2' ] },
                values_by_path: {
                    'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] },
                    'validations.valuesByPathInvalid': false
                },
                unset_paths: [ 'response.home.someField' ],
                expectedOutput: {
                    hiddenWidgets: '',
                    invalidFields: 'valuesByPathInvalid|invalidWidget1|invalidWidget2'
                }
            }
        ];

        test.each(testCases)('Test with $description', async ({ userAction, values_by_path, unset_paths, expectedOutput }) => {
            // Prepare the button click log
            const buttonLog = {
                ...commonInterviewData,
                event_type: 'button_click',
                timestamp_sec: 1,
                event_date: new Date(1 * 1000),
                values_by_path,
                unset_paths,
                user_action: userAction
            };

            // Add the logs to the stream
            mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock([buttonLog]) as any);

            const fileName = await exportInterviewLogTask({});

            // Check the file content of the exported logs
            expect(mockCreateStream).toHaveBeenCalledTimes(1);
            expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

            const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
            expect(csvFileName).toBeDefined();

            const csvStream = fileStreams[csvFileName as string];
            expect(csvStream.data.length).toEqual(1);

            // Get the actual row in the file data
            const logRows = await getCsvFileRows(csvStream.data);
            expect(logRows.length).toEqual(1);

            // Test the row values
            const modifiedKeys = Object.entries(values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
            const initializedKeys = Object.entries(values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
            expect(logRows[0]).toEqual({
                ...commonInterviewDataInRows,
                event_type: 'button_click',
                timestampMs : String((1) * 1000),
                event_date: new Date((1) * 1000).toISOString(),
                modifiedFields: modifiedKeys,
                initializedFields: initializedKeys,
                unsetFields: unset_paths !== undefined ? unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '',
                widgetType: '',
                widgetPath: userAction.buttonId,
                hiddenWidgets: expectedOutput.hiddenWidgets,
                invalidFields: expectedOutput.invalidFields,
                validFields: '',
                browser: '',
                os: '',
                platform: '',
                language: ''
            });
        });
    });

    test('Test with an event of type section_change with user action', async () => {
        // Just add one log statement to test the widget_interaction event:
        const userAction = { type: 'sectionChange', targetSection: { sectionShortname: 'someSection' } };
        const userActionWithHidden = { type: 'sectionChange', targetSection: { sectionShortname: 'someSection', iterationContext: ['person', 'personId'] }, previousSection: { sectionShortname: 'prevSection' }, hiddenWidgets: [ 'hiddenWidget1', 'hiddenWidget2' ] };
        const sectionChangeLogs: { [key: string]: any }[] = [{
            ...commonInterviewData,
            event_type: 'section_change',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: userAction
        }, {
            ...commonInterviewData,
            event_type: 'section_change',
            timestamp_sec: 2,
            event_date: new Date(2 * 1000),
            values_by_path: { },
            user_action: userActionWithHidden
        }];
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(sectionChangeLogs) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should be one row per log
        expect(csvStream.data.length).toEqual(sectionChangeLogs.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per log
        expect(logRows.length).toEqual(sectionChangeLogs.length);

        // Test the row values
        const modifiedKeys = Object.entries(sectionChangeLogs[0].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeys = Object.entries(sectionChangeLogs[0].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[0]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'section_change',
            timestampMs : String((1) * 1000),
            event_date: new Date((1) * 1000).toISOString(),
            modifiedFields: modifiedKeys,
            initializedFields: initializedKeys,
            unsetFields: sectionChangeLogs[0].unset_paths !== undefined ? sectionChangeLogs[0].unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '',
            widgetType: '',
            widgetPath: userAction.targetSection.sectionShortname,
            hiddenWidgets: '',
            invalidFields: '',
            validFields: 'home.geography',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });

        const modifiedKeys2 = Object.entries(sectionChangeLogs[1].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeys2 = Object.entries(sectionChangeLogs[1].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[1]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'section_change',
            timestampMs : String((2) * 1000),
            event_date: new Date((2) * 1000).toISOString(),
            modifiedFields: modifiedKeys2,
            initializedFields: initializedKeys2,
            unsetFields: sectionChangeLogs[1].unset_paths !== undefined ? sectionChangeLogs[1].unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '',
            widgetType: '',
            widgetPath: userAction.targetSection.sectionShortname + '/' + (userActionWithHidden.targetSection.iterationContext || []).join('/'),
            hiddenWidgets: userActionWithHidden.hiddenWidgets.join('|'),
            invalidFields: '',
            validFields: '',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });
        
    });

    test('Test with an event of type language_change with user action', async () => {
        // Add one log statement, with/without hidden paths to test the button_click event:
        const languageChange: UserAction = { type: 'languageChange', language: 'fr' };
        const languageLogs: { [key: string]: any }[] = [{
            ...commonInterviewData,
            event_type: 'language_change',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: languageChange
        }];
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(languageLogs) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should be one row per log
        expect(csvStream.data.length).toEqual(languageLogs.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per log
        expect(logRows.length).toEqual(languageLogs.length);

        // Test the row values
        const modifiedKeysLog1 = Object.entries(languageLogs[0].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeysLog1 = Object.entries(languageLogs[0].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[0]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'language_change',
            timestampMs : String((1) * 1000),
            event_date: new Date((1) * 1000).toISOString(),
            modifiedFields: modifiedKeysLog1,
            initializedFields: initializedKeysLog1,
            unsetFields: languageLogs[0].unset_paths !== undefined ? languageLogs[0].unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '',
            widgetType: '',
            widgetPath: '',
            hiddenWidgets: '',
            invalidFields: '',
            validFields: 'home.geography',
            browser: '',
            os: '',
            platform: '',
            language: 'fr'
        });
    });

    test('Test with an event of type interview_open with user action', async () => {
        // Add one log statement, with/without hidden paths to test the button_click event:
        const userAction: UserAction = { type: 'interviewOpen', language: 'en', browser: { name: 'firefox' } };
        const interviewOpenLogs: { [key: string]: any }[] = [{
            ...commonInterviewData,
            event_type: 'interview_open',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: userAction
        }];
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(interviewOpenLogs) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should be one row per log
        expect(csvStream.data.length).toEqual(interviewOpenLogs.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per log
        expect(logRows.length).toEqual(interviewOpenLogs.length);

        // Test the row values
        const modifiedKeysLog1 = Object.entries(interviewOpenLogs[0].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeysLog1 = Object.entries(interviewOpenLogs[0].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[0]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'interview_open',
            timestampMs : String((1) * 1000),
            event_date: new Date((1) * 1000).toISOString(),
            modifiedFields: modifiedKeysLog1,
            initializedFields: initializedKeysLog1,
            unsetFields: interviewOpenLogs[0].unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|'),
            widgetType: '',
            widgetPath: '',
            hiddenWidgets: '',
            invalidFields: '',
            validFields: 'home.geography',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });
    });

    test('Test with various events, with validations `true` and `false`', async () => {
        // Add some log statements with validations data: first statement has only true, second has one false, third has both true and false
        const interviewLogs: { [key: string]: any }[] = [{
            ...commonInterviewData,
            event_type: 'button_click',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true, 'response.household.size': 3, 'response._activeTripId': null },
            unset_paths: [ 'response.home.someField', 'validations.home.someField' ],
            user_action: { type: 'buttonClick', buttonId: 'response.someField' }
        }, {
            ...commonInterviewData,
            event_type: 'widget_interaction',
            timestamp_sec: 2,
            event_date: new Date(2 * 1000),
            values_by_path: { 'validations.home.someField': false },
            user_action: { type: 'widgetInteraction', path: 'response.home.someField', value: 'someValue', widgetType: 'radio' }
        },{
            ...commonInterviewData,
            event_type: 'button_click',
            timestamp_sec: 3,
            event_date: new Date(3 * 1000),
            values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
            unset_paths: [ 'response.home.someField' ],
            user_action: { type: 'buttonClick', buttonId: 'response.someField' }
        }];
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(interviewLogs) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should be one row per log
        expect(csvStream.data.length).toEqual(interviewLogs.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per log
        expect(logRows.length).toEqual(interviewLogs.length);

        // Test the row values
        const modifiedKeysLog1 = Object.entries(interviewLogs[0].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeysLog1 = Object.entries(interviewLogs[0].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[0]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'button_click',
            timestampMs : String((1) * 1000),
            event_date: new Date((1) * 1000).toISOString(),
            modifiedFields: modifiedKeysLog1,
            initializedFields: initializedKeysLog1,
            unsetFields: interviewLogs[0].unset_paths !== undefined ? interviewLogs[0].unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|') : '',
            widgetType: '',
            widgetPath: interviewLogs[0].user_action.buttonId,
            hiddenWidgets: '',
            invalidFields: '',
            validFields: 'home.geography',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });

        const modifiedKeysLog2 = Object.entries(interviewLogs[1].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeysLog2 = Object.entries(interviewLogs[1].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[1]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'widget_interaction',
            timestampMs : String((2) * 1000),
            event_date: new Date((2) * 1000).toISOString(),
            modifiedFields: modifiedKeysLog2,
            initializedFields: initializedKeysLog2,
            unsetFields: interviewLogs[1].unset_paths !== undefined ? interviewLogs[1].unset_paths.join('|') : '',
            widgetType: interviewLogs[1].user_action.widgetType,
            widgetPath: interviewLogs[1].user_action.path,
            hiddenWidgets: '',
            invalidFields: 'home.someField',
            validFields: '',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });

        const modifiedKeysLog3 = Object.entries(interviewLogs[2].values_by_path).filter(([key, value]) => value !== null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        const initializedKeysLog3 = Object.entries(interviewLogs[2].values_by_path).filter(([key, value]) => value === null && !key.startsWith('validations.')).map(([key, value]) => key).join('|');
        expect(logRows[2]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'button_click',
            timestampMs : String((3) * 1000),
            event_date: new Date((3) * 1000).toISOString(),
            modifiedFields: modifiedKeysLog3,
            initializedFields: initializedKeysLog3,
            unsetFields: interviewLogs[2].unset_paths !== undefined ? interviewLogs[2].unset_paths.join('|') : '',
            widgetType: '',
            widgetPath: interviewLogs[2].user_action.buttonId,
            hiddenWidgets: '',
            invalidFields: ['home.household.size', 'home.someField'].join('|'),
            validFields: 'home.geography',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });
    });

    test('Test a legacy event with no event data', async () => {
        // Add one log statement, with/without hidden paths to test the button_click event:
        const legacyEmptyLog: { [key: string]: any }[] = [{
            ...commonInterviewData,
            event_type: 'legacy',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: null,
            unset_paths: null,
            user_action: null,
            for_correction: null
        }];
        // Add the logs to the stream
        mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(legacyEmptyLog) as any);

        const fileName = await exportInterviewLogTask({});

        // Check the file content of the exported logs
        expect(mockCreateStream).toHaveBeenCalledTimes(1);
        expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

        const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
        expect(csvFileName).toBeDefined();

        const csvStream = fileStreams[csvFileName as string];
        // There should be one row per log
        expect(csvStream.data.length).toEqual(legacyEmptyLog.length);

        // Get the actual rows in the file data
        const logRows = await getCsvFileRows(csvStream.data);
        // There should be one row per log
        expect(logRows.length).toEqual(legacyEmptyLog.length);

        // Test the row values
        expect(logRows[0]).toEqual({
            ...commonInterviewDataInRows,
            event_type: 'legacy',
            timestampMs : String((1) * 1000),
            event_date: new Date((1) * 1000).toISOString(),
            for_correction: '',
            modifiedFields: '',
            initializedFields: '',
            unsetFields: '',
            widgetType: '',
            widgetPath: '',
            hiddenWidgets: '',
            invalidFields: '',
            validFields: '',
            browser: '',
            os: '',
            platform: '',
            language: ''
        });
    });

    describe('Test with various context data', () => {
        // Set default values for logs
        const makeLog = (partial: { [key: string]: any }) => ({
            ...commonInterviewData,
            event_type: 'legacy',
            timestamp_sec: 1,
            event_date: new Date(1 * 1000),
            values_by_path: null,
            unset_paths: null,
            user_action: null,
            for_correction: null,
            ...partial
        });

        // Deduce the expected values from the log data, with specific overrides for some fields if needed
        const expectedRowFromLog = (log: { [key: string]: any }, overrides: { [key: string]: any } = {}) => ({
            ...commonInterviewDataInRows,
            event_type: log.event_type ?? 'legacy',
            timestampMs: String((log.timestamp_sec ?? 0) * 1000),
            event_date: new Date((log.timestamp_sec ?? 0) * 1000).toISOString(),
            for_correction: log.for_correction === true ? 'true' : log.for_correction === false ? 'false' : '',
            modifiedFields: log.values_by_path
                ? Object.entries(log.values_by_path)
                    .filter(([key, value]) => value !== null && !key.startsWith('validations.'))
                    .map(([key]) => key)
                    .join('|')
                : '',
            initializedFields: log.values_by_path
                ? Object.entries(log.values_by_path)
                    .filter(([key, value]) => value === null && !key.startsWith('validations.'))
                    .map(([key]) => key)
                    .join('|')
                : '',
            unsetFields: log.unset_paths
                ? log.unset_paths.filter((path: string) => !path.startsWith('validations.')).join('|')
                : '',
            widgetType: '',
            widgetPath: '',
            hiddenWidgets: '',
            invalidFields: log.values_by_path
                ? Object.entries(log.values_by_path)
                    .filter(([key, value]) => key.startsWith('validations.') && value !== true)
                    .map(([key]) => key.replace('validations.', ''))
                    .join('|')
                : '',
            validFields: log.values_by_path
                ? Object.entries(log.values_by_path)
                    .filter(([key, value]) => key.startsWith('validations.') && value === true)
                    .map(([key]) => key.replace('validations.', ''))
                    .join('|')
                : '',
            browser: '',
            os: '',
            platform: '',
            language: '',
            ...overrides
        });

        const platformData1 = { parsedResult: { browser: { name: 'Firefox', version: '146.0' }, os: { name: 'Linux' }, platform: { type: 'desktop'} } };
        const platformData2 = { parsedResult: { browser: { name: 'Safari', version: '146.0' }, os: { name: 'MacOs' }, platform: { type: 'mobile'} } } ;

        const contextCases = [
            {
                description: 'single user and multiple context switches',
                logs: [
                    makeLog({
                        // Event setting the platform
                        event_type: 'side_effect',
                        timestamp_sec: 1,
                        event_date: new Date(1 * 1000),
                        values_by_path: { 'response._browser': platformData1 }
                    }),
                    makeLog({
                        // Event setting the language for the first time
                        event_type: 'language_change',
                        timestamp_sec: 2,
                        event_date: new Date(2 * 1000),
                        user_action: { type: 'languageChange', language: 'fr' }
                    }),
                    makeLog({
                        // Arbitrary event
                        event_type: 'button_click',
                        timestamp_sec: 3,
                        event_date: new Date(3 * 1000),
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Event setting the platform again with different values, to check that the latest context is used for the subsequent events
                        event_type: 'side_effect',
                        timestamp_sec: 4,
                        event_date: new Date(4 * 1000),
                        values_by_path: { 'response._browser': platformData2 }
                    }),
                    makeLog({
                        // Arbitrary event
                        event_type: 'button_click',
                        timestamp_sec: 5,
                        event_date: new Date(5 * 1000),
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Event setting the language with legacy response data
                        event_type: 'legacy',
                        timestamp_sec: 6,
                        event_date: new Date(6 * 1000),
                        values_by_path: { 'response._language': 'es' }
                    })
                ],
                expectedRowOverrides: [
                    {
                        // Browser 1, no language yet
                        browser: platformData1.parsedResult.browser.name,
                        os: platformData1.parsedResult.os.name,
                        platform: platformData1.parsedResult.platform.type
                    },
                    {
                        // Browser 1, language set to French
                        browser: platformData1.parsedResult.browser.name,
                        os: platformData1.parsedResult.os.name,
                        platform: platformData1.parsedResult.platform.type,
                        language: 'fr'
                    },
                    {
                        browser: platformData1.parsedResult.browser.name,
                        os: platformData1.parsedResult.os.name,
                        platform: platformData1.parsedResult.platform.type,
                        language: 'fr',
                        widgetPath: 'response.someField',
                    },
                    {
                        // Browser 2, language set to French
                        browser: platformData2.parsedResult.browser.name,
                        os: platformData2.parsedResult.os.name,
                        platform: platformData2.parsedResult.platform.type,
                        language: 'fr'
                    },
                    {
                        browser: platformData2.parsedResult.browser.name,
                        os: platformData2.parsedResult.os.name,
                        platform: platformData2.parsedResult.platform.type,
                        language: 'fr',
                        widgetPath: 'response.someField',
                    },
                    {
                        // Browser 2, language set to Spanish with legacy response data
                        browser: platformData2.parsedResult.browser.name,
                        os: platformData2.parsedResult.os.name,
                        platform: platformData2.parsedResult.platform.type,
                        language: 'es'
                    }
                ]
            }, {
                description: 'multiple users intricated, with/without correction for browser context',
                logs: [
                    makeLog({
                        // Event setting the platform for participant
                        event_type: 'side_effect',
                        timestamp_sec: 1,
                        event_date: new Date(1 * 1000),
                        values_by_path: { 'response._browser': platformData1 }
                    }),
                    makeLog({
                        // Event setting the platform for user 1 in participant mode
                        event_type: 'side_effect',
                        user_id: 1,
                        timestamp_sec: 2,
                        event_date: new Date(2 * 1000),
                        values_by_path: { 'response._browser': platformData2 }
                    }),
                    makeLog({
                        // Arbitrary event for user 1 in correction mode, browser not set
                        event_type: 'button_click',
                        timestamp_sec: 3,
                        event_date: new Date(3 * 1000),
                        user_id: 1,
                        for_correction: true,
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Arbitrary event for user 1 in participant mode, keep previous browser
                        event_type: 'button_click',
                        timestamp_sec: 4,
                        event_date: new Date(4 * 1000),
                        user_id: 1,
                        for_correction: false,
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Arbitrary event for participant, use previous browser
                        event_type: 'button_click',
                        timestamp_sec: 5,
                        event_date: new Date(5 * 1000),
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Setting browser for user 1 in correction mode
                        event_type: 'side_effect',
                        user_id: 1,
                        for_correction: true,
                        timestamp_sec: 6,
                        event_date: new Date(6 * 1000),
                        values_by_path: { 'corrected_response._browser': platformData1 }
                    }),
                    makeLog({
                        // Arbitrary event for user 1 in participant mode, keep previous browser
                        event_type: 'button_click',
                        timestamp_sec: 7,
                        event_date: new Date(7 * 1000),
                        user_id: 1,
                        for_correction: false,
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                ],
                expectedRowOverrides: [
                    {
                        browser: platformData1.parsedResult.browser.name,
                        os: platformData1.parsedResult.os.name,
                        platform: platformData1.parsedResult.platform.type
                    },
                    {
                        browser: platformData2.parsedResult.browser.name,
                        os: platformData2.parsedResult.os.name,
                        platform: platformData2.parsedResult.platform.type,
                        user_id: '1'
                    },
                    {
                        browser: '',
                        os: '',
                        platform: '',
                        widgetPath: 'response.someField',
                        user_id: '1',
                        for_correction: 'true'
                    },
                    {
                        browser: platformData2.parsedResult.browser.name,
                        os: platformData2.parsedResult.os.name,
                        platform: platformData2.parsedResult.platform.type,
                        widgetPath: 'response.someField',
                        user_id: '1'
                    },
                    {
                        browser: platformData1.parsedResult.browser.name,
                        os: platformData1.parsedResult.os.name,
                        platform: platformData1.parsedResult.platform.type,
                        widgetPath: 'response.someField',
                    },
                    {
                        browser: platformData1.parsedResult.browser.name,
                        os: platformData1.parsedResult.os.name,
                        platform: platformData1.parsedResult.platform.type,
                        user_id: '1',
                        for_correction: 'true'
                    },
                    {
                        browser: platformData2.parsedResult.browser.name,
                        os: platformData2.parsedResult.os.name,
                        platform: platformData2.parsedResult.platform.type,
                        widgetPath: 'response.someField',
                        user_id: '1'
                    },
                ]
            }, {
                description: 'multiple users intricated, with/without correction for language context',
                logs: [
                    makeLog({
                        // Event setting the language with legacy response data
                        event_type: 'legacy',
                        timestamp_sec: 1,
                        event_date: new Date(1 * 1000),
                        values_by_path: { 'response._language': 'fr' }
                    }),
                    makeLog({
                        // Event setting the language for user 1 in participant mode
                        event_type: 'language_change',
                        user_id: 1,
                        timestamp_sec: 2,
                        event_date: new Date(2 * 1000),
                        user_action: { type: 'languageChange', language: 'es' }
                    }),
                    makeLog({
                        // Arbitrary event for user 1 in correction mode, language not set
                        event_type: 'button_click',
                        timestamp_sec: 3,
                        event_date: new Date(3 * 1000),
                        user_id: 1,
                        for_correction: true,
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Arbitrary event for user 1 in participant mode, keep previous language
                        event_type: 'button_click',
                        timestamp_sec: 4,
                        event_date: new Date(4 * 1000),
                        user_id: 1,
                        for_correction: false,
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Arbitrary event for participant, use previous language
                        event_type: 'button_click',
                        timestamp_sec: 5,
                        event_date: new Date(5 * 1000),
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                    makeLog({
                        // Setting language for user 1 in correction mode
                        event_type: 'language_change',
                        user_id: 1,
                        for_correction: true,
                        timestamp_sec: 6,
                        event_date: new Date(6 * 1000),
                        values_by_path: { 'corrected_response._language': 'fr' }
                    }),
                    makeLog({
                        // Arbitrary event for user 1 in participant mode, keep previous language
                        event_type: 'button_click',
                        timestamp_sec: 7,
                        event_date: new Date(7 * 1000),
                        user_id: 1,
                        for_correction: false,
                        values_by_path: { 'validations.home.geography': true, 'validations.home.household.size': false, 'validations.home.someField': false },
                        unset_paths: [ 'response.home.someField' ],
                        user_action: { type: 'buttonClick', buttonId: 'response.someField' }
                    }),
                ],
                expectedRowOverrides: [
                    {
                        language: 'fr'
                    },
                    {
                        language: 'es',
                        user_id: '1'
                    },
                    {
                        language: '',
                        widgetPath: 'response.someField',
                        user_id: '1',
                        for_correction: 'true'
                    },
                    {
                        language: 'es',
                        widgetPath: 'response.someField',
                        user_id: '1'
                    },
                    {
                        language: 'fr',
                        widgetPath: 'response.someField',
                    },
                    {
                        language: 'fr',
                        user_id: '1',
                        for_correction: 'true'
                    },
                    {
                        language: 'es',
                        widgetPath: 'response.someField',
                        user_id: '1'
                    },
                ]
            }
        ];

        test.each(contextCases)('Test with $description', async ({ logs, expectedRowOverrides }) => {
            mockGetInterviewLogsStream.mockReturnValue(new ObjectReadableMock(logs) as any);

            const fileName = await exportInterviewLogTask({});

            expect(mockCreateStream).toHaveBeenCalledTimes(1);
            expect(mockGetInterviewLogsStream).toHaveBeenCalledWith({ forCorrection: undefined, interviewId: undefined });

            const csvFileName = Object.keys(fileStreams).find((filename) => filename.endsWith(fileName));
            expect(csvFileName).toBeDefined();

            const csvStream = fileStreams[csvFileName as string];
            expect(csvStream.data.length).toEqual(logs.length);

            const logRows = await getCsvFileRows(csvStream.data);
            expect(logRows.length).toEqual(expectedRowOverrides.length);
            for (let i = 0; i < expectedRowOverrides.length; i++) {
                const expectedRow = expectedRowFromLog(
                    logs[i],
                    expectedRowOverrides[i]
                );
                expect(logRows[i]).toEqual(expectedRow);
            }
        });
    });

});
