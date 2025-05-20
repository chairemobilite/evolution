import { v4 as uuidV4 } from 'uuid';
import each from 'jest-each';
import updateServerFields, { getPreFilledResponseByPath, setPreFilledResponse } from '../serverFieldUpdate';
import prefilledDbQueries from '../../../models/interviewsPreFill.db.queries';
import TestUtils from 'chaire-lib-common/lib/test/TestUtils';

jest.mock('../../../models/interviewsPreFill.db.queries', ()  => ({
    getByReferenceValue: jest.fn(),
    setPreFilledResponseForRef: jest.fn()
}));
const mockGetByReferenceValue = prefilledDbQueries.getByReferenceValue as jest.MockedFunction<typeof prefilledDbQueries.getByReferenceValue>;
const mockSetPreFilledResponseForRef = prefilledDbQueries.setPreFilledResponseForRef as jest.MockedFunction<typeof prefilledDbQueries.setPreFilledResponseForRef>;
const deferredUpdateCallback = jest.fn();

const interviewAttributes = {
    uuid: uuidV4(),
    id: 4,
    participant_id: 4,
    is_valid: true,
    is_active: true,
    is_completed: false,
    is_questionable: false,
    response: {
        accessCode: '11111',
        testFields: {
            fieldA: 'a',
            fieldB: 'b'
        }
    },
    validations: {},
    survey_id: 1
} as any;
const testRedirectUrl = 'http://localhost:8080/test';

const mockedOperation = jest.fn();
const updateCallbacks = [
    {
        field: 'testFields.fieldA',
        runOnValidatedData: true,
        callback: jest.fn().mockImplementation((interview, fieldValue) =>
            fieldValue === 'foo'
                ? { 'testFields.fieldB': 'bar' }
                : fieldValue === 'same'
                    ?  { 'testFields.fieldB': interviewAttributes.response.testFields.fieldB }
                    : {})
    }, {
        field: { regex: 'household\.persons\.*\.origin' },
        callback: jest.fn().mockImplementation((interview, fieldValue, fieldPath: string) => {
            const newFieldPath = fieldPath.substring(0, fieldPath.length - '.origin'.length) + '.new';
            return { [newFieldPath]: 'FOO' };
        })
    }, {
        field: '_isCompleted',
        callback: jest.fn().mockImplementation((interview, fieldValue, fieldPath: string) => {
            if (fieldValue === true) {
                return [{}, testRedirectUrl];
            }
            return {};
        })
    }, {
        field: 'testFields.callback',
        callback: jest.fn().mockImplementation((interview, fieldValue, fieldPath: string, registerCallback) => {
            registerCallback({
                opName: 'testFields.callback',
                opUniqueId: fieldValue,
                operation: mockedOperation.mockResolvedValue({ 'testFields.callbackResponse': `${fieldValue}.appended` })
            });
            return {};
        })
    }
];

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Simple field update', () => {
    each([
        ['Values by path, but field not updated', { 'response.testFields.fieldB': 'abc' }, []],
        ['Unset path, but field not updated', { }, ['response.testFields.fieldB']],
        ['Field set, should return empty', { 'response.testFields.fieldA': '121' }, [], 0, {}],
        ['Field set in validated data, should run for this callback', { 'validated_data.testFields.fieldA': '121' }, [], 0, {}],
        ['Field set to specific value, should return an update', { 'response.testFields.fieldA': 'foo' }, [], 0, { 'response.testFields.fieldB': 'bar' }],
        ['Field set to specific value in validated_data, should return an update', { 'validated_data.testFields.fieldA': 'foo' }, [], 0, { 'validated_data.testFields.fieldB': 'bar' }],
        ['Field updated to same value, should not be returned', { 'response.testFields.fieldA': 'same' }, [], 0, {}],
        ['Field unset, should return empty', { 'response.testFields.fieldB': 'abc' }, ['response.testFields.fieldA'], 0, {}],
        ['Field update, should return URL', { 'response._isCompleted' : true }, [], 2, {}, testRedirectUrl],
        ['Field update, no URL return', { 'response._isCompleted' : false }, [], 2, {}, undefined],
        ['Field update in validated_data, should not run for this callback', { 'validated_data._isCompleted' : false }, [], false, {}, undefined],
        ['Not a field in response or validated_data', { '_isCompleted' : false }, [], false, {}, undefined],
        ['No data', { }, undefined],
    ]).test('%s', async (_description, valuesByPath, unsetPath, called: number | false = false, expectedFieldValues: { [path: string]: unknown } = {}, expectedUrl = undefined) => {
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, unsetPath, deferredUpdateCallback)).toEqual([expectedFieldValues, expectedUrl]);
        if (called !== false) {
            expect(updateCallbacks[called].callback).toHaveBeenCalledTimes(1);
            if (called === 0) {
                expect(updateCallbacks[called].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['response.testFields.fieldA'] !== undefined ? valuesByPath['response.testFields.fieldA'] : valuesByPath['validated_data.testFields.fieldA'], 'testFields.fieldA', expect.anything());
            } else if (called === 2) {
                expect(updateCallbacks[called].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['response._isCompleted'], '_isCompleted', expect.anything());
            }

        } else {
            for (let i = 0; i < updateCallbacks.length; i++) {
                expect(updateCallbacks[i].callback).not.toHaveBeenCalled();
            }
        }
        expect(deferredUpdateCallback).not.toHaveBeenCalled();
    });
});

describe('Field with placeholder and regex', () => {
    test('Field in valuesByPath, should return updated value', async () => {
        const valuesByPath = { 'response.household.persons.1.origin': 'foo' };
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [], deferredUpdateCallback)).toEqual([{ 'response.household.persons.1.new': 'FOO' }, undefined]);
        expect(updateCallbacks[1].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['response.household.persons.1.origin'], 'household.persons.1.origin', expect.anything());
    });

    test('Field in unsetPath, should return updated value', async() => {
        const unsetPath = [ 'response.household.persons.2.origin' ];
        expect(await updateServerFields(interviewAttributes, updateCallbacks, {}, unsetPath)).toEqual([{ 'response.household.persons.2.new': 'FOO' }, undefined]);
        expect(updateCallbacks[1].callback).toHaveBeenCalledWith(interviewAttributes, undefined, 'household.persons.2.origin', undefined);

    });
});

test('No field update callbacks', async () => {
    expect(await updateServerFields(interviewAttributes, [], { someField: 'abc' }, [])).toEqual([{}, undefined]);
});

describe('With an update execution callback registration', () => {
    test('One execution callback call', async () => {
        const valuesByPath = { 'response.testFields.callback': 'bar' };
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [], deferredUpdateCallback)).toEqual([{ }, undefined]);

        // Flush promises to make sure the execution callback has been called
        await TestUtils.flushPromises();
        expect(updateCallbacks[3].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['response.testFields.callback'], 'testFields.callback', expect.anything());
        expect(deferredUpdateCallback).toHaveBeenCalledWith({ 'response.testFields.callbackResponse' : 'bar.appended' });
    });

    test('Multiple calls to same execution, sequentially', async () => {
        const valuesByPath = { 'response.testFields.callback': 'bar' };
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [], deferredUpdateCallback)).toEqual([{ }, undefined]);

        // Flush promises to make sure the execution callback has been called
        await TestUtils.flushPromises();

        // Make a second call with other values
        const valuesByPath2 = { 'response.testFields.callback': 'foo' };
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath2, [], deferredUpdateCallback)).toEqual([{ }, undefined]);

        // Flush promises to make sure the execution callback has been called
        await TestUtils.flushPromises();

        expect(deferredUpdateCallback).toHaveBeenCalledWith({ 'response.testFields.callbackResponse' : 'bar.appended' });
        expect(deferredUpdateCallback).toHaveBeenCalledWith({ 'response.testFields.callbackResponse' : 'foo.appended' });
    });

    test('Multiple calls to same execution, at the same time', async () => {
        const valuesByPath = { 'response.testFields.callback': 'bar' };
        let finishOp1 = false;
        const call1Response = { 'testFields.callbackResponse' : 'bar.appended.call1' };

        let promiseComplete: Promise<any> | undefined = undefined;
        mockedOperation.mockImplementationOnce(() => {
            promiseComplete = new Promise((resolve) => {
                const waitFinish = () => setTimeout(() => {
                    if (finishOp1) {
                        console.log('resolving');
                        resolve(call1Response);
                    } else {
                        waitFinish();
                    }
                }, 1000);
                waitFinish();
            });
            return promiseComplete;
        });
        // First call should execute the operation
        await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [], deferredUpdateCallback);
        // Second call should not execute anything
        await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [], deferredUpdateCallback);

        // Let the operation terminate
        finishOp1 = true;
        await (promiseComplete as unknown as Promise<any>);

        // Flush promises to make sure the execution callback has been completed. It should be called only once
        await TestUtils.flushPromises();
        expect(updateCallbacks[3].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['response.testFields.callback'], 'testFields.callback', expect.anything());
        expect(deferredUpdateCallback).toHaveBeenCalledTimes(1);
        expect(deferredUpdateCallback).toHaveBeenCalledWith(Object.keys(call1Response).reduce((acc, key) => {
            acc[`response.${key}`] = call1Response[key];
            return acc;
        }, {}));
    });

    test('Multiple calls, with different unique ID, with cancellation', async () => {
        const valuesByPath = { 'response.testFields.callback': 'bar' };
        let finishOp1 = false;
        const call1Response = { 'testFields.callbackResponse' : 'bar.appended.call1' };

        let promiseComplete: Promise<any> | undefined = undefined;
        mockedOperation.mockImplementationOnce(() => {
            promiseComplete = new Promise((resolve) => {
                const waitFinish = () => setTimeout(() => {
                    if (finishOp1) {
                        console.log('resolving');
                        resolve(call1Response);
                    } else {
                        waitFinish();
                    }
                }, 1000);
                waitFinish();
            });
            return promiseComplete;
        });
        // First call should execute the operation
        await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [], deferredUpdateCallback);
        // Make a second call with other values, should cancel the first one
        const valuesByPath2 = { 'response.testFields.callback': 'foo' };
        await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath2, [], deferredUpdateCallback);

        // Flush promises to make sure the second operation terminate first
        await TestUtils.flushPromises();

        // Let the first operation terminate, it is cancelled, the results should be ignored
        finishOp1 = true;
        await (promiseComplete as unknown as Promise<any>);

        // Test that the deferred callback was called only once, with the results of the last operation
        expect(deferredUpdateCallback).toHaveBeenCalledTimes(1);
        expect(deferredUpdateCallback).toHaveBeenCalledWith({ 'response.testFields.callbackResponse' : 'foo.appended' });
    });
});

test('Test with exceptions', async () => {
    updateCallbacks[0].callback.mockRejectedValueOnce('error');
    updateCallbacks[0].callback.mockRejectedValueOnce('error');
    expect(await updateServerFields(interviewAttributes, updateCallbacks, { 'response.testFields.fieldA': 'foo' }, [])).toEqual([{}, undefined]);
    expect(await updateServerFields(interviewAttributes, updateCallbacks, { }, ['response.testFields.fieldA'])).toEqual([{}, undefined]);
});

describe('getPreFilledValuesByPath', () => {

    beforeEach(() => {
        mockGetByReferenceValue.mockClear();
    });

    test('Return undefined response', async() => {
        mockGetByReferenceValue.mockResolvedValueOnce(undefined);
        const preFilledValuesByPath = await getPreFilledResponseByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({});
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });

    test('Return fields that are not in the interview', async () => {
        const preFilledResponse = {
            'testFields.fieldC': { value: 'abc' },
            'otherField': { value: 3 }
        };
        mockGetByReferenceValue.mockResolvedValueOnce(preFilledResponse);
        const preFilledValuesByPath = await getPreFilledResponseByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({
            'testFields.fieldC': preFilledResponse['testFields.fieldC'].value,
            'otherField': preFilledResponse['otherField'].value
        });
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });

    test('Return values that are in the interview, that should be forced', async() => {
        const preFilledResponse = {
            'testFields.fieldB': { value: 'abc', actionIfPresent: 'force' as const },
            'accessCode': { value: '2222' },
            'otherField': { value: 4 }
        };
        mockGetByReferenceValue.mockResolvedValueOnce(preFilledResponse);
        const preFilledValuesByPath = await getPreFilledResponseByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({
            'testFields.fieldB': preFilledResponse['testFields.fieldB'].value,
            'otherField': preFilledResponse['otherField'].value
        });
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });

    test('Return values that are in the interview, don\'t update', async() => {
        const preFilledResponse = {
            'testFields.fieldB': { value: 'abc', actionIfPresent: 'doNothing' as const },
            'accessCode': { value: '2222', actionIfPresent: 'doNothing' as const }
        };
        mockGetByReferenceValue.mockResolvedValueOnce(preFilledResponse);
        const preFilledValuesByPath = await getPreFilledResponseByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({});
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });

    test('Exception getting the values', async() => {
        mockGetByReferenceValue.mockRejectedValueOnce('error');
        const preFilledValuesByPath = await getPreFilledResponseByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({});
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });
});

describe('setPreFilledResponse', () => {

    const preFilledResponse = {
        'testFields.fieldC': { value: 'abc' },
        'otherField': { value: 3 }
    };

    beforeEach(() => {
        mockSetPreFilledResponseForRef.mockClear();
    });

    test('Setting prefilled response', async () => {
        mockSetPreFilledResponseForRef.mockResolvedValueOnce(true);
        await setPreFilledResponse('test', preFilledResponse);
        expect(mockSetPreFilledResponseForRef).toHaveBeenLastCalledWith('test', preFilledResponse);
    });

    test('Exception setting the values', async() => {
        mockSetPreFilledResponseForRef.mockRejectedValueOnce('error');
        await setPreFilledResponse('test', preFilledResponse);
        expect(mockSetPreFilledResponseForRef).toHaveBeenLastCalledWith('test', preFilledResponse);
    });
});
