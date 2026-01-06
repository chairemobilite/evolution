/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import { Knex } from 'knex';
import each from 'jest-each';
import _isEqual from 'lodash/isEqual';
import _cloneDeep from 'lodash/cloneDeep';

import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../paradataEvents.db.queries';
import interviewsDbQueries from '../interviews.db.queries';

// Mock data
const localParticipant = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const secondParticipant = {
    id: 11,
    email: 'test1@transition.city',
    is_valid: true
};

const localUser = {
    ...localParticipant,
    id: 2,
    uuid: uuidV4()
};

const testInterviewAttributes1 = {
    id: 100,
    uuid: uuidV4(),
    participant_id: localParticipant.id,
    is_valid: false,
    is_active: true,
    is_completed: undefined,
    response: {
        accessCode: '11111',
        booleanField: true,
    },
    validations: {}
} as any;

const testInterviewAttributes2 = {
    id: 200,
    uuid: uuidV4(),
    participant_id: secondParticipant.id,
    is_valid: false,
    is_active: true,
    is_completed: undefined,
    response: {
        _isCompleted: true,
        accessCode: '11111',
        booleanField: true,
    },
    validations: {}
} as any;

beforeAll(async () => {
    jest.setTimeout(10000);
    // Initialize participants, users and interviews
    await truncate(knex, 'paradata_events');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localParticipant as any);
    await create(knex, 'sv_participants', undefined, secondParticipant as any);
    await truncate(knex, 'users');
    await create(knex, 'users', undefined, localUser as any);
    await interviewsDbQueries.create(testInterviewAttributes1);
    await interviewsDbQueries.create(testInterviewAttributes2);
});

afterAll(async() => {
    await truncate(knex, 'paradata_events');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.destroy();
});

const testStart = Date.now();

describe('paradata log', () => {

    beforeEach(async () => {
        await truncate(knex, 'paradata_events');
    });

    const defaultEventData = { someData: 'value', anotherData: 'value' };

    const validateLogData = async (expected: { userId: number | null, eventData: any, forCorrection?: boolean }[]) => {
        const now = Date.now() + 1; // Add 1ms to make sure we are not equal to now at the ms precision (timestamps are at us precision)
        const events = await knex('paradata_events').select(['*', knex.raw('EXTRACT(EPOCH FROM timestamp) as unix_timestamp')]).orderBy('timestamp');
        expect(events.length).toEqual(expected.length);

        let lastTimestamp = testStart;
        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            // Validate all timestamps are greater than previous or test start and less than now (at us precision, it should not be equal)
            expect(event.unix_timestamp * 1000).toBeGreaterThan(lastTimestamp);
            expect(event.unix_timestamp * 1000).toBeLessThan(now);
            lastTimestamp = event.unix_timestamp * 1000;

            // Validate interview ID, event type, user_id and event data
            expect(event.interview_id).toEqual(testInterviewAttributes1.id);
            expect(event.event_type).toEqual('button_click');
        }
        // For each expected data, make sure there's a log
        for (let i = 0; i < expected.length; i++) {
            const expectedData = expected[i];
            const event = events.find((event) => expectedData.userId === event.user_id && _isEqual(expectedData.eventData, event.event_data));
            expect(event).toEqual(expect.objectContaining({
                event_data: expectedData.eventData,
                user_id: expectedData.userId,
                for_correction: expectedData.forCorrection === true ? true : false
            }));
        }
    };

    test('Log for a participant (no user id)', async() => {
        expect(await dbQueries.log({
            interviewId: testInterviewAttributes1.id,
            eventType: 'button_click',
            eventData: defaultEventData
        })).toEqual(true);
        await validateLogData([{ userId: null, eventData: defaultEventData }]);
    });

    test('Log with user ID', async () => {
        expect(await dbQueries.log({
            interviewId: testInterviewAttributes1.id,
            eventType: 'button_click',
            eventData: defaultEventData,
            userId: localUser.id
        })).toEqual(true);
        await validateLogData([{ userId: localUser.id, eventData: defaultEventData }]);
    });

    test.each([
        [true],
        [false]
    ])('Log with forCorrection set to `%s`', async (forCorrection) => {
        expect(await dbQueries.log({
            interviewId: testInterviewAttributes1.id,
            eventType: 'button_click',
            eventData: defaultEventData,
            userId: localUser.id,
            forCorrection
        })).toEqual(true);
        await validateLogData([{ userId: localUser.id, eventData: defaultEventData, forCorrection }]);
    });

    test('Log multiple data', async() => {
        const secondEventData = { someData: 'value2', anotherData: 'value2', something: 'test' };
        // Save a log for user and a log for participant
        const promises = [
            dbQueries.log({
                interviewId: testInterviewAttributes1.id,
                eventType: 'button_click',
                eventData: defaultEventData,
                userId: localUser.id
            }),
            dbQueries.log({
                interviewId: testInterviewAttributes1.id,
                eventType: 'button_click',
                eventData: secondEventData
            })
        ];
        await Promise.all(promises);
        await validateLogData([
            { userId: localUser.id, eventData: defaultEventData },
            { userId: null, eventData: secondEventData }
        ]);
    });

    each([
        ['Invalid event type', { eventType: 'invalid_event_type' }],
        ['Unknown user', { userId: localUser.id + 1 } ],
        ['Unknown interview ID', { interviewId: testInterviewAttributes1.id + 1 }],
    ]).test('Log with errors: %s', async (_desc, changedData) => {
        const invalidParadataLog = Object.assign({
            interviewId: testInterviewAttributes1.id,
            eventType: 'button_click',
            eventData: defaultEventData
        }, changedData);
        await expect(dbQueries.log(invalidParadataLog)).rejects.toThrow(expect.anything());
        const data = await knex('paradata_events').select();
        expect(data.length).toEqual(0);
    });

});

// Wait for a number of millisecond: in a db tests, inserts are often done too rapidly and we may want to throttle
const throttle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Insert a number of logs in the database, waiting for a delay between each insert
const insertSomeLogs = async (logData: Record<string, any>[], interviewId: number, userId?: number | undefined, forCorrection?: boolean | undefined) => {
    for (let i = 0; i < logData.length; i++) {
        const { eventType, ...eventData } = logData[i];
        await dbQueries.log({
            interviewId: interviewId,
            eventType: eventType || 'legacy',
            eventData: eventData,
            userId,
            forCorrection
        });
        await throttle(10);
    }
};

describe('Stream paradata', () => {

    beforeEach(async () => {
        // Empty all logs
        await truncate(knex, 'paradata_events');
    });

    test('Stream interview logs, no logs in database', (done) => {
        let nbLogs = 0;
        const queryStream = dbQueries.getParadataStream();
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                nbLogs++;
            })
            .on('end', () => {
                expect(nbLogs).toEqual(0);
                done();
            });
    });

    test('Stream interview logs, only one interview has logs', (done) => {
        // Add a few logs to one of the interview, with/without valuesByPath, with/without unsetPaths
        const logData = [
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true }
            }, {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true },
                unsetPaths: []
            }, {
                valuesByPath: { },
                unsetPaths: [ 'response.data' ]
            }, {
                unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
            }
        ];

        insertSomeLogs(logData, testInterviewAttributes1.id).then(() => {
            let nbLogs = 0;
            let lastTimestamp = -1;
            const queryStream = dbQueries.getParadataStream();
            queryStream.on('error', (error) => {
                console.error(error);
                expect(true).toBe(false);
                done();
            })
                .on('data', (row) => {
                    // Check the data
                    expect(row.uuid).toEqual(testInterviewAttributes1.uuid);

                    // Expected sort by timestamp, timestamp should be greater than previous
                    const rowTimestamp = Number(row.timestamp_sec);
                    expect(rowTimestamp).toBeGreaterThanOrEqual(lastTimestamp);
                    lastTimestamp = rowTimestamp;
                    expect(row.event_date).toEqual(new Date(row.timestamp_sec * 1000).toISOString());
                    // Expected valuesByPath and unsetPaths to match the log data
                    const log = logData[nbLogs];
                    expect(log).toBeDefined();
                    expect(row.values_by_path).toEqual(log?.valuesByPath ? log.valuesByPath : null);
                    expect(row.unset_paths).toEqual(log?.unsetPaths ? log.unsetPaths : null);
                    expect(row.user_id).toBeNull();
                    expect(row.interview_is_completed).toBeNull();

                    nbLogs++;
                })
                .on('end', () => {
                    expect(nbLogs).toEqual(logData.length);
                    done();
                });
        }).catch((error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        });

    });

    test('Stream interview logs, many interview logs, should be sorted by interview/time', (done) => {
        // Add a few logs to one of the interview, with/without valuesByPath, with/without unsetPaths
        const logData1 = [
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true }
            },
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true },
                unsetPaths: []
            },
            {
                valuesByPath: { },
                unsetPaths: [ 'response.data' ]
            },
            {
                unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
            }
        ];
        const logData2 = [
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 2, 2 ] }, 'validations.home.geography': false }
            },
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 3, 3 ] }, 'validations.home.geography': true },
                unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
            }
        ];
        const insertLogs = async () => {
            // Insert a few logs for the first interview
            await insertSomeLogs(logData1, testInterviewAttributes1.id);

            // Then for the second
            await insertSomeLogs(logData2, testInterviewAttributes2.id);

            // And finally for the first again
            await insertSomeLogs(logData2, testInterviewAttributes1.id);
        };
        insertLogs().then(() => {

            let nbLogs = 0;
            let lastTimestamp = -1;
            let currentInterviewId: number | undefined = undefined;
            let interviewLogsForFirstCompleted = false;
            let currentInterviewIndex = 0;

            // This is the expected logs for the interview 1, a concatenation of the 2 log data arrays
            const logsFor1 = logData1.concat(logData2 as any);

            // Test the stream and its data
            const queryStream = dbQueries.getParadataStream();
            queryStream.on('error', (error) => {
                console.error(error);
                expect(true).toBe(false);
                done();
            })
                .on('data', (row) => {
                    // Check the data
                    // Sorted by interview ID, all logs for first interview should be before all logs for second interview, so we should only switch once
                    if (nbLogs === 0) {
                        currentInterviewId = row.id;
                    }
                    if (currentInterviewId !== row.id) {
                        currentInterviewId = row.id;
                        lastTimestamp = -1;
                        expect(interviewLogsForFirstCompleted).toEqual(false);
                        interviewLogsForFirstCompleted = true;
                        currentInterviewIndex = 0;
                        // Should be the second interview now, with completed status true
                        expect(row.interview_is_completed).toEqual('true');
                    }

                    // Expected sort by timestamp, timestamp should be greater than previous
                    const rowTimestamp = Number(row.timestamp_sec);
                    expect(rowTimestamp).toBeGreaterThan(lastTimestamp);
                    lastTimestamp = rowTimestamp;
                    // Expected valuesByPath and unsetPaths to match the log data
                    const logArrayToCheck = currentInterviewId === testInterviewAttributes1.id ? logsFor1 : logData2;
                    const log = logArrayToCheck[currentInterviewIndex];
                    expect(log).toBeDefined();
                    expect(row.values_by_path).toEqual(log?.valuesByPath ? log.valuesByPath : null);
                    expect(row.unset_paths).toEqual(log?.unsetPaths ? log.unsetPaths : null);

                    nbLogs++;
                    currentInterviewIndex++;
                })
                .on('end', () => {
                    expect(nbLogs).toEqual(logsFor1.length + logData2.length);
                    done();
                });
        }).catch((error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        });
    });

    test('Stream interview logs for single interview, many interview logs, should be sorted by time', (done) => {
        // Add a few logs to the interview, with/without valuesByPath, with/without unsetPaths
        const logData1 = [
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true }
            },
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true },
                unsetPaths: []
            },
            {
                valuesByPath: { },
                unsetPaths: [ 'response.data' ]
            },
            {
                unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
            }
        ];
        const logData2 = [
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 2, 2 ] }, 'validations.home.geography': false }
            },
            {
                valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 3, 3 ] }, 'validations.home.geography': true },
                unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
            }
        ];
        const insertLogs = async () => {
            // Insert a few logs for the first interview
            await insertSomeLogs(logData1, testInterviewAttributes1.id);

            // Then for the second
            await insertSomeLogs(logData2, testInterviewAttributes2.id);

            // And finally for the first again
            await insertSomeLogs(logData2, testInterviewAttributes1.id);
        };
        insertLogs().then(() => {
            let nbLogs = 0;
            let lastTimestamp = -1;

            // This is the expected logs for the interview 1, a concatenation of the 2 log data arrays
            const logsFor1 = logData1.concat(logData2 as any);

            // Get logs only for one interview
            const queryStream = dbQueries.getParadataStream({ interviewId: testInterviewAttributes1.id });
            queryStream.on('error', (error) => {
                console.error(error);
                expect(true).toBe(false);
                done();
            })
                .on('data', (row) => {
                    // Check the data, only the logs for the first interview should be returned
                    expect(row.uuid).toEqual(testInterviewAttributes1.uuid);

                    // Expected sort by timestamp, timestamp should be greater than previous
                    const rowTimestamp = Number(row.timestamp_sec);
                    expect(rowTimestamp).toBeGreaterThan(lastTimestamp);
                    lastTimestamp = rowTimestamp;
                    // Expected valuesByPath and unsetPaths to match the log data
                    const log = logsFor1[nbLogs];
                    expect(log).toBeDefined();
                    expect(row.values_by_path).toEqual(log?.valuesByPath ? log.valuesByPath : null);
                    expect(row.unset_paths).toEqual(log?.unsetPaths ? log.unsetPaths : null);

                    nbLogs++;
                })
                .on('end', () => {
                    // Only the logs for the first interview should be returned
                    expect(nbLogs).toEqual(logsFor1.length);
                    done();
                });
        }).catch((error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        });
    });

    describe('with forCorrection filter', () => {

        const participantEvent = {
            eventType: 'section_change',
            userAction: { type: 'sectionChange', targetSection: { sectionShortname: 'someSection' } },
        };
        const interviewerEvent = {
            eventType: 'side_effect',
            valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true },
            unsetPaths: []
        };
        const correctionEvent = {
            eventType: 'widget_interaction',
            valuesByPath: { },
            unsetPaths: [ 'response.data' ],
            userAction: { type: 'widgetInteraction', path: 'response.home.someField', value: 'someValue', widgetType: 'radio' }
        };
        const unknownResponseEvent = {
            eventType: 'legacy',
            valuesByPath: { },
            unsetPaths: [ 'response.data' ]
        };

        beforeEach(async () => {
            // Add a log for a participant without user
            await insertSomeLogs([participantEvent], testInterviewAttributes1.id);
            // Add a log for a user with forCorrection = false
            await insertSomeLogs([interviewerEvent], testInterviewAttributes1.id, localUser.id, false);
            // Add a log for a user with forCorrection = true
            await insertSomeLogs([correctionEvent], testInterviewAttributes1.id, localUser.id, true);
            // Add a log for a user, then manually update the database to set the for_correction to null
            await insertSomeLogs([unknownResponseEvent], testInterviewAttributes1.id, localUser.id, false);
            await knex.raw(`UPDATE paradata_events SET for_correction = NULL WHERE event_type = 'legacy' AND user_id IS NOT NULL`)
        })

        test('Stream interview with forCorrection set to `false`, should return participant and null', (done) => {
            
            let nbLogs = 0;
            let lastTimestamp = -1;

            // This is the expected logs for the participant data
            const expectedLogs = [
                participantEvent,
                interviewerEvent,
                unknownResponseEvent
            ];

            // Get logs only for one interview
            const queryStream = dbQueries.getParadataStream({ forCorrection: false });
            queryStream.on('error', (error) => {
                console.error(error);
                expect(true).toBe(false);
                done();
            })
                .on('data', (row) => {
                    // Check the data, only the logs for the first interview should be returned
                    expect(row.uuid).toEqual(testInterviewAttributes1.uuid);

                    // Expected sort by timestamp, timestamp should be greater than previous
                    const rowTimestamp = Number(row.timestamp_sec);
                    expect(rowTimestamp).toBeGreaterThan(lastTimestamp);
                    lastTimestamp = rowTimestamp;
                    // Expected valuesByPath, unsetPaths and userAction to match the log data
                    const log = expectedLogs[nbLogs] as any;
                    expect(log).toBeDefined();
                    expect(row.values_by_path).toEqual(log?.valuesByPath ? log.valuesByPath : null);
                    expect(row.unset_paths).toEqual(log?.unsetPaths ? log.unsetPaths : null);
                    expect(row.user_action).toEqual(log?.userAction ? log.userAction : null);

                    nbLogs++;
                })
                .on('end', () => {
                    // Only the logs for the first interview should be returned
                    expect(nbLogs).toEqual(expectedLogs.length);
                    done();
                });
        });

        test('Stream interview with forCorrection set to `true`, should return corrected and null', (done) => {
            
            let nbLogs = 0;
            let lastTimestamp = -1;

            // This is the expected logs for the participant data
            const expectedLogs = [
                correctionEvent,
                unknownResponseEvent
            ];

            // Get logs only for one interview
            const queryStream = dbQueries.getParadataStream({ forCorrection: true });
            queryStream.on('error', (error) => {
                console.error(error);
                expect(true).toBe(false);
                done();
            })
                .on('data', (row) => {
                    // Check the data, only the logs for the first interview should be returned
                    expect(row.uuid).toEqual(testInterviewAttributes1.uuid);

                    // Expected sort by timestamp, timestamp should be greater than previous
                    const rowTimestamp = Number(row.timestamp_sec);
                    expect(rowTimestamp).toBeGreaterThan(lastTimestamp);
                    lastTimestamp = rowTimestamp;
                    // Expected valuesByPath, unsetPaths and userAction to match the log data
                    const log = expectedLogs[nbLogs] as any;
                    expect(log).toBeDefined();
                    expect(row.values_by_path).toEqual(log?.valuesByPath ? log.valuesByPath : null);
                    expect(row.unset_paths).toEqual(log?.unsetPaths ? log.unsetPaths : null);
                    expect(row.user_action).toEqual(log?.userAction ? log.userAction : null);

                    nbLogs++;
                })
                .on('end', () => {
                    expect(nbLogs).toEqual(expectedLogs.length);
                    done();
                });
        });

        test('Stream interview with forCorrection set to `true` and interviewId set', (done) => {
            
            // Add a few logs for a second interview, with forCorrection = true
            insertSomeLogs([correctionEvent, unknownResponseEvent], testInterviewAttributes2.id, localUser.id, true).then(() => {
                let nbLogs = 0;
                let lastTimestamp = -1;

                // This is the expected logs for the participant data
                const expectedLogs = [
                    correctionEvent,
                    unknownResponseEvent
                ];

                // Get logs only for one interview
                const queryStream = dbQueries.getParadataStream({ interviewId: testInterviewAttributes1.id, forCorrection: true });
                queryStream.on('error', (error) => {
                    console.error(error);
                    expect(true).toBe(false);
                    done();
                })
                    .on('data', (row) => {
                        // Check the data, only the logs for the first interview should be returned
                        expect(row.uuid).toEqual(testInterviewAttributes1.uuid);

                        // Expected sort by timestamp, timestamp should be greater than previous
                        const rowTimestamp = Number(row.timestamp_sec);
                        expect(rowTimestamp).toBeGreaterThan(lastTimestamp);
                        lastTimestamp = rowTimestamp;
                        // Expected valuesByPath, unsetPaths and userAction to match the log data
                        const log = expectedLogs[nbLogs] as any;
                        expect(log).toBeDefined();
                        expect(row.values_by_path).toEqual(log?.valuesByPath ? log.valuesByPath : null);
                        expect(row.unset_paths).toEqual(log?.unsetPaths ? log.unsetPaths : null);
                        expect(row.user_action).toEqual(log?.userAction ? log.userAction : null);

                        nbLogs++;
                    })
                    .on('end', () => {
                        expect(nbLogs).toEqual(expectedLogs.length);
                        done();
                    });
            }).catch((error) => {
                console.error(error);
                expect(true).toBe(false);
                done();
            });

        });

    });

});

describe('Query paradata temp view', () => {

    // Prepare two interviews, one complete and one incomplete
    let completeInterviewId: number | undefined;
    let incompleteInterviewId: number | undefined;
    const completeInterviewAttributes = _cloneDeep(testInterviewAttributes1);
    delete completeInterviewAttributes.id;
    completeInterviewAttributes.response = {
        ...completeInterviewAttributes.response,
        _completedAt: new Date().toISOString(),
        _isCompleted: true
    }

    const incompleteInterviewAttributes = _cloneDeep(testInterviewAttributes2);
    delete incompleteInterviewAttributes.id;
    delete incompleteInterviewAttributes.response._isCompleted;

    let trx: Knex.Transaction;

    beforeEach(async () => {
        // Reset interviews and participants, create one incomplete and one complete interview
        await truncate(knex, 'paradata_events');
        await truncate(knex, 'sv_interviews');
        await truncate(knex, 'sv_participants');
        await create(knex, 'sv_participants', undefined, localParticipant as any);
        await create(knex, 'sv_participants', undefined, secondParticipant as any);
        await truncate(knex, 'users');
        await create(knex, 'users', undefined, localUser as any);
        delete completeInterviewAttributes.id;
        delete incompleteInterviewAttributes.id;
        const returnedId = await interviewsDbQueries.create(completeInterviewAttributes, 'id');
        completeInterviewId = returnedId.id;
        const returnedId2 = await interviewsDbQueries.create(incompleteInterviewAttributes, 'id');
        incompleteInterviewId = returnedId2.id;
    });

    const getTransactionForTempView = async (): Promise<Knex.Transaction> => {
        const trx = await knex.transaction();
        await trx.raw('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        // Create the temp view in the transaction
        await dbQueries.createParadataWithWidgetPathTable(trx);
        return trx;
    }

    describe('getIncompleteInterviewsLastEventCounts', () => {
        test('No events logged', async () => {
            const trx = await getTransactionForTempView();
            try {
                const result = await dbQueries.getIncompleteInterviewsLastEventCounts(trx);
                expect(result).toBeDefined();
                expect(result.length).toEqual(0);
            } finally {
                await trx.commit();
            }
        });

        test('Should return count only for incomplete interviews', async () => {
            // Add a few logs to both interviews
            const logData = [
                {
                    eventType: 'widget_interaction',
                    valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true }
                }, {
                    eventType: 'widget_interaction',
                    valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true },
                    unsetPaths: []
                }, {
                    eventType: 'server_event',
                    valuesByPath: { },
                    unsetPaths: [ 'response.data' ]
                }, {
                    eventType: 'side_effect',
                    unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
                }
            ];

            await insertSomeLogs(logData, completeInterviewId!);
            await insertSomeLogs(logData, incompleteInterviewId!);

            const trx = await getTransactionForTempView();
            try {
                const result = await dbQueries.getIncompleteInterviewsLastEventCounts(trx);
                expect(result).toBeDefined();
                expect(result.length).toEqual(1);
                expect(result[0]).toEqual({ event_type: 'widget_interaction', count: '1' });
            } finally {
                await trx.commit();
            }
        });

        test('Should return last action only for participants (no user ID)', async () => {
            // Add a few logs to each interview, associated with a user ID (interviewer)
            const logData = [
                {
                    eventType: 'widget_interaction',
                    valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true }
                }, {
                    eventType: 'widget_interaction',
                    valuesByPath: { 'response.home.geography': { type: 'Point', coordinates: [ 1, 1 ] }, 'validations.home.geography': true },
                    unsetPaths: []
                }, {
                    eventType: 'server_event',
                    valuesByPath: { },
                    unsetPaths: [ 'response.data' ]
                }, {
                    eventType: 'side_effect',
                    unsetPaths: [ 'response.data.someField', 'validations.data.someField' ]
                }
            ];

            await insertSomeLogs(logData, completeInterviewId!, localUser.id);
            await insertSomeLogs(logData, incompleteInterviewId!, localUser.id);

            const trx = await getTransactionForTempView();
            try {
                const result = await dbQueries.getIncompleteInterviewsLastEventCounts(trx);
                expect(result).toBeDefined();
                expect(result.length).toEqual(0);
            } finally {
                await trx.commit();
            }
        });
    });

});
