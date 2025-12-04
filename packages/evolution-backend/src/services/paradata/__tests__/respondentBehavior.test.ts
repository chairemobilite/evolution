/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import paradataQueries from '../../../models/paradataEvents.db.queries';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

import { RespondentBehaviorService } from '../respondentBehavior';

// Mock the paradata queries module used by the service
jest.mock('../../../models/paradataEvents.db.queries', () => ({
    createParadataWithWidgetPathTable: jest.fn(),
    getIncompleteInterviewsLastEventCounts: jest.fn()
}));
const createParadataTblMock = paradataQueries.createParadataWithWidgetPathTable as jest.MockedFunction<typeof paradataQueries.createParadataWithWidgetPathTable>;
const getIncompleteInterviewsLastEventCountsMock = paradataQueries.getIncompleteInterviewsLastEventCounts as jest.MockedFunction<typeof paradataQueries.getIncompleteInterviewsLastEventCounts>;

// Mock the knex transaction function used by the service
jest.mock('chaire-lib-backend/lib/config/shared/db.config', () => ({
    transaction: jest.fn()
}));
const transactionMock = knex.transaction as jest.MockedFunction<typeof knex.transaction>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('RespondentBehaviorService', () => {
    test('getRespondentBehaviorMetrics returns parsed counts and calls creation/query functions', async () => {
        // Prepare mock trx and behavior
        const mockTrx = { raw: jest.fn() } as any;

        // Mock knex.transaction to call the callback with our mockTrx
        transactionMock.mockImplementation(async (cb) => {
            return await cb(mockTrx);
        });

        // Mock the paradata queries to return one row
        getIncompleteInterviewsLastEventCountsMock.mockResolvedValueOnce([
            { event_type: 'button_click', count: '7' }
        ]);

        // Call the service
        const metrics = await RespondentBehaviorService.getRespondentBehaviorMetrics();

        // Assertions: createParadataWithWidgetPathTable and getIncompleteInterviewsLastEventCounts called with trx
        expect(paradataQueries.createParadataWithWidgetPathTable).toHaveBeenCalledTimes(1);
        expect(paradataQueries.createParadataWithWidgetPathTable).toHaveBeenCalledWith(mockTrx);
        expect(paradataQueries.getIncompleteInterviewsLastEventCounts).toHaveBeenCalledTimes(1);
        expect(paradataQueries.getIncompleteInterviewsLastEventCounts).toHaveBeenCalledWith(mockTrx);

        // The returned metrics should parse the count string as number
        expect(metrics).toBeDefined();
        expect(metrics.incompleteInterviewsLastActionCounts).toHaveLength(1);
        expect(metrics.incompleteInterviewsLastActionCounts[0]).toEqual({ eventType: 'button_click', count: 7 });

        // The transaction should have had its isolation level set
        expect(mockTrx.raw).toHaveBeenCalledWith('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    });

    test('getRespondentBehaviorMetrics propagates errors from queries', async () => {
        const mockTrx = { raw: jest.fn() } as any;
        transactionMock.mockImplementation(async (cb) => cb(mockTrx));

        const error = new Error('db failure');
        createParadataTblMock.mockRejectedValueOnce(error);

        await expect(RespondentBehaviorService.getRespondentBehaviorMetrics()).rejects.toThrow('db failure');

        expect(createParadataTblMock).toHaveBeenCalledWith(mockTrx);
    });
});
