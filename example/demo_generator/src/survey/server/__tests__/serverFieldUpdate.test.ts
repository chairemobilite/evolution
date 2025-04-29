import moment from 'moment-business-days';
import { ObjectReadableMock } from 'stream-mock';
import updateCallbacks, { updateAssignedDayRates } from '../serverFieldUpdate';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import _cloneDeep from 'lodash/cloneDeep';
import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import RandomUtils from 'chaire-lib-common/lib/utils/RandomUtils';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { getTransitSummary } from 'evolution-backend/lib/services/routing';

const { getPreFilledResponsesByPath } = require('evolution-backend/lib/services/interviews/serverFieldUpdate');
jest.useFakeTimers();

jest.mock('evolution-backend/lib/models/interviews.db.queries', () => ({
    getInterviewsStream: jest.fn().mockImplementation(() => new ObjectReadableMock([]))
}));
const getInterviewStreamMock = interviewsDbQueries.getInterviewsStream as jest.MockedFunction<typeof interviewsDbQueries.getInterviewsStream>;
jest.mock('chaire-lib-common/lib/utils/RandomUtils', () => ({
    randomFromDistribution: jest.fn()
}));
const randomMock = RandomUtils.randomFromDistribution as jest.MockedFunction<typeof RandomUtils.randomFromDistribution>;
jest.mock('evolution-backend/lib/services/routing', () => ({
    getTransitSummary: jest.fn()
}));
const summaryMock = getTransitSummary as jest.MockedFunction<typeof getTransitSummary>;
jest.mock('evolution-backend/lib/services/interviews/serverFieldUpdate', () => ({
    getPreFilledResponsesByPath: jest.fn().mockResolvedValue({})
}));
const preFilledMock = getPreFilledResponsesByPath;

const baseInterview: InterviewAttributes = {
    responses: {
        household: {
            size: 1,
            tripsDate: '2022-09-26',
            persons: {
                a12345: {
                    age: 56,
                    gender: 'female',
                    occupation: 'fullTimeStudent',
                    visitedPlaces: {
                        p1: {
                            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.1, 45.1] }, properties: { lastAction: 'shortcut' }},
                            activity: 'service',
                            arrivalTime: 42900,
                            departureTime: 45000,
                            nextPlaceCategory: 'visitedAnotherPlace'
                        } as any,
                        p2: {
                            geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.3, 45.0] }, properties: { lastAction: 'shortcut' }},
                            activity: 'service',
                            arrivalTime: 46800,
                            departureTime: 54000,
                            nextPlaceCategory: 'visitedAnotherPlace'
                        } as any
                    },
                    trips: {
                        t1: {
                            _originVisitedPlaceUuid: 'p1',
                            _destinationVisitedPlaceUuid: 'p2',
                            segments: {
                                s1: {
                                    _sequence: 1,
                                    mode: 'transitBus'
                                }
                            }
                        }
                    }
                } as any
            }
        } as any,
        previousDay: '2022-09-12',
        previousBusinessDay: '2022-09-12',
        _activePersonId: 'a12345'
    },
    id: 1,
    uuid: 'arbitrary',
    participant_id: 1,
    is_completed: false,
    validations: {},
    is_valid: true,
    logs: []
};

describe('test survey day assignation', function () {

    beforeEach(() => {
        jest.clearAllMocks();
    })
    const updateCallback = (updateCallbacks.find((callback) => callback.field === 'previousDay') as any).callback;

    test('Day already assigned', async () => {
        const interview = _cloneDeep(baseInterview);
        interview.responses.assignedDay = interview.responses.previousDay;
        expect(await updateCallback(interview, interview.responses.previousBusinessDay)).toEqual({});
        expect(randomMock).not.toHaveBeenCalled();
    });

    test('No data for days, should be previous day', async () => {
        // Prepare less than 500 interviews to be returned for the assigned day update
        const interviews: any[] = [];
        interviews.push({ responses: { assignedDay: '2022-09-09' } as any});
        interviews.push({ responses: { assignedDay: '2022-09-09' } as any});
        interviews.push({ responses: { assignedDay: '2022-09-09' } as any});
        interviews.push({ responses: { } as any});
        getInterviewStreamMock.mockReturnValue(new ObjectReadableMock(interviews) as any);

        // Update the assigned day rates
        await updateAssignedDayRates();

        // Validate call to get assigned day rates, the filter should be with a completed at data, for completed and not invalid interviews
        expect(getInterviewStreamMock).toHaveBeenCalledTimes(1);
        expect(getInterviewStreamMock).toHaveBeenCalledWith({ 
            filters: { 'responses._completedAt': expect.anything(), 'responses._isCompleted': { value: true }, 'is_valid': { value: false, op: 'not' } },
            select: { responses: 'validatedIfAvailable', includeAudits: false }
        });
        
        // Do the update callback with those data
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, interview.responses.previousBusinessDay)).toEqual({ 'assignedDay': interview.responses.previousBusinessDay, 'originalAssignedDay': interview.responses.previousBusinessDay });
        expect(randomMock).not.toHaveBeenCalled();
    });

    test('No data for days, but previous days is weekend', async () => {
        randomMock.mockReturnValue(2);

        const interview = _cloneDeep(baseInterview);
        // Previous day is sunday
        expect(await updateCallback(interview, '2022-09-11')).toEqual({ 'assignedDay': '2022-09-09', 'originalAssignedDay': '2022-09-09' });
        expect(randomMock).toHaveBeenCalledTimes(1);
    });

    test('Should be called with probabilities, when more than 500 days', async() => {
        // Return 500 for previous day (monday), 100 last friday, 200 wednesday, 200 tuesday
        const interviews: any[] = [];
        for (let i = 0; i < 500; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-23' }});
        };
        for (let i = 0; i < 100; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-20' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-19' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-18' }});
        };
        getInterviewStreamMock.mockReturnValue(new ObjectReadableMock(interviews) as any);

        // Update the assigned day rates
        await updateAssignedDayRates();

        randomMock.mockReturnValue(3);

        // Use a previous day of monday
        const interview = _cloneDeep(baseInterview);
        interview.responses.previousDay = '2024-09-23';
        expect(await updateCallback(interview, '2024-09-23')).toEqual({ 'assignedDay': '2024-09-20', 'originalAssignedDay': '2024-09-20' });
        expect(randomMock).toHaveBeenCalledTimes(1);
        const randomParams = randomMock.mock.calls[0];
        // Weekend should have 0 probability, but day before (monday) should have one
        expect(randomParams[0][0]).toBeGreaterThan(0);
        expect(randomParams[0][1]).toEqual(0);
        expect(randomParams[0][2]).toEqual(0);
        // 3 days ago should have higher probability
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][0]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][1]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][2]);
        expect(randomParams[2]).toEqual((randomParams[0] as number[]).reduce((sum, current) => sum + current, 0));
    });

    test('With a holiday', async() => {
        // Add a holiday for october 10, 2022
        moment.updateLocale('en', {
            holidays: ['2022-10-10'],
            holidayFormat: 'YYYY-MM-DD' ,
        });
        // Return 200 for previous day (monday), 300 last friday, 200 wednesday, 200 tuesday
        const interviews: any[] = [];
        for (let i = 0; i < 200; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-23' }});
        };
        for (let i = 0; i < 300; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-20' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-19' }});
        };
        for (let i = 0; i < 200; i++) {
            interviews.push({ responses: { assignedDay: '2024-09-18' }});
        };
        getInterviewStreamMock.mockReturnValue(new ObjectReadableMock(interviews) as any);

        randomMock.mockReturnValue(3);

        // Use a holiday as previous day
        const interview = _cloneDeep(baseInterview);
        interview.responses.previousDay = '2022-10-10';
        expect(await updateCallback(interview, interview.responses.previousDay)).toEqual({ 'assignedDay': '2022-10-07', 'originalAssignedDay': '2022-10-07' });
       
        expect(randomMock).toHaveBeenCalledTimes(1);
        const randomParams = randomMock.mock.calls[0];
        // Monday, sunday and saturday should have 0 probability
        expect(randomParams[0][0]).toEqual(0);
        expect(randomParams[0][1]).toEqual(0);
        expect(randomParams[0][2]).toEqual(0);
        // 3 days ago should have higher probability
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][0]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][1]);
        expect(randomParams[0][3]).toBeGreaterThan(randomParams[0][2]);
        expect(randomParams[2]).toEqual((randomParams[0] as number[]).reduce((sum, current) => sum + current, 0));
    });

});

describe('test transit summary generation', function () {
    const updateCallback = (updateCallbacks.find((callback) => (callback.field as {regex: string}).regex !== undefined) as any).callback;
    const registerUpdateOperationMock = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
        config.trRoutingScenarios = {
            SE: 'ScenarioDeSemaine',
            SA: 'ScenarioDuSamedi',
            DI: 'ScenarioDuDimanche'
        };
    });

    test('Non transit mode', async () => {
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, 'carPassenger', 'household.persons.a12345.trips.t1.segments.s1.modePre', registerUpdateOperationMock))
            .toEqual({ ['household.persons.a12345.trips.t1.segments.s1.trRoutingResult']: undefined });
        expect(registerUpdateOperationMock).not.toHaveBeenCalled();
    });

    test('Transit data', async () => {
        const response = {
            status: 'success' as const,
            nbRoutes: 1,
            lines: [
                {
                    lineUuid: 'luuid',
                    lineShortname: 'lsn',
                    lineLongname: 'lln',
                    agencyUuid: 'auuid',
                    agencyAcronym: 'aa',
                    agencyName: 'an',
                    alternativeCount: 1
                }
            ],
            source: 'unitTest'
        };
        const interview = _cloneDeep(baseInterview);
        summaryMock.mockResolvedValue(response);
        expect(await updateCallback(interview, 'transit', 'household.persons.a12345.trips.t1.segments.s1.modePre', registerUpdateOperationMock))
            .toEqual({ });
        expect(registerUpdateOperationMock).toHaveBeenCalledWith({ 
            opName: `transitSummary-73.145.1-73.345`,
            opUniqueId: 1,
            operation: expect.anything()});
        const { operation } = registerUpdateOperationMock.mock.calls[0][0];
        const operationResult = await(operation(() => false));
        expect(operationResult).toEqual({ ['household.persons.a12345.trips.t1.segments.s1.trRoutingResult']: response });
        expect(summaryMock).toHaveBeenCalledWith(expect.objectContaining({
            origin: (baseInterview.responses.household as any).persons.a12345.visitedPlaces.p1.geography,
            destination: (baseInterview.responses.household as any).persons.a12345.visitedPlaces.p2.geography,
            departureSecondsSinceMidnight: 45000,
            transitScenario: 'ScenarioDeSemaine'
        }));
    });

    test('Undefined person', async () => {
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, 'transit', 'household.persons.a12345111.trips.t1.segments.s1.modePre', registerUpdateOperationMock))
            .toEqual({ ['household.persons.a12345.trips.t1.segments.s1.trRoutingResult']: undefined });
        expect(registerUpdateOperationMock).not.toHaveBeenCalled();
    });

    test('Undefined trip', async () => {
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, 'transit', 'household.persons.a12345.trips.t2.segments.s1.modePre', registerUpdateOperationMock))
            .toEqual({ ['household.persons.a12345.trips.t1.segments.s1.trRoutingResult']: undefined });
        expect(registerUpdateOperationMock).not.toHaveBeenCalled();
    });

});

describe('access code update', function () {
    const updateCallback = (updateCallbacks.find((callback) => callback.field === 'accessCode') as any).callback;
    
    test('properly formatted access code', async () => {
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, '1111-1111'))
            .toEqual({ });
    });

    test('Format update', async () => {
        const interview = _cloneDeep(baseInterview);
        expect(await updateCallback(interview, '11111111'))
            .toEqual({ 'accessCode': '1111-1111' });
    });

});
