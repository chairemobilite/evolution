import { v4 as uuidV4 } from 'uuid';
import each from 'jest-each';
import updateServerFields, { getPreFilledResponsesByPath, setPreFilledResponses } from '../serverFieldUpdate';
import prefilledDbQueries from '../../../models/interviewsPreFill.db.queries'; 

jest.mock('../../../models/interviewsPreFill.db.queries', ()  => ({
    getByReferenceValue: jest.fn(),
    setPreFilledResponsesForRef: jest.fn()
}));
const mockGetByReferenceValue = prefilledDbQueries.getByReferenceValue as jest.MockedFunction<typeof prefilledDbQueries.getByReferenceValue>;
const mockSetPreFilledResponsesForRef = prefilledDbQueries.setPreFilledResponsesForRef as jest.MockedFunction<typeof prefilledDbQueries.setPreFilledResponsesForRef>;

const interviewAttributes = {
    uuid: uuidV4(),
    id: 4,
    participant_id: 4,
    is_valid: true,
    is_active: true,
    is_completed: false,
    responses: {
        accessCode: '11111',
        testFields: {
            fieldA: 'a',
            fieldB: 'b'
        }
    },
    validations: {},
    logs: []
};

const updateCallbacks = [
    {
        field: 'testFields.fieldA',
        callback: jest.fn().mockImplementation((interview, fieldValue) =>
            fieldValue === 'foo'
            ? { 'testFields.fieldB': 'bar' }
            : fieldValue === 'same'
                ?  { 'testFields.fieldB': interviewAttributes.responses.testFields.fieldB }
                : {})
    },
    {
        field: { regex: 'household\.persons\.*\.origin' },
        callback: jest.fn().mockImplementation((interview, fieldValue, fieldPath: string) => {
            const newFieldPath = fieldPath.substring(0, fieldPath.length - '.origin'.length) + '.new';
            return { [newFieldPath]: 'FOO' }
        })
    }
];

beforeEach(() => {
    updateCallbacks[0].callback.mockClear();
    updateCallbacks[1].callback.mockClear();
})

describe('Simple field update', () => {
    each([
        ['Values by path, but field not updated', { 'responses.testFields.fieldB': 'abc'}, []],
        ['Unset path, but field not updated', { }, ['responses.testFields.fieldB']],
        ['Field set, should return empty', { 'responses.testFields.fieldA': '121'}, [], true, {}],
        ['Field set to specific value, should return an update', { 'responses.testFields.fieldA': 'foo'}, [], true, { 'responses.testFields.fieldB': 'bar'}],
        ['Field updated to same value, should not be returned', { 'responses.testFields.fieldA': 'same'}, [], true, {}],
        ['Field unset, should return empty', { 'responses.testFields.fieldB': 'abc' }, ['responses.testFields.fieldA'], true, {}],
        ['No data', { }, undefined],
    ]).test('%s', async (_description, valuesByPath, unsetPath, called: boolean = false, expected: { [path: string]: unknown } = {}) => {
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, unsetPath)).toEqual(expected);
        if (called) {
            expect(updateCallbacks[0].callback).toHaveBeenCalledTimes(1);
            expect(updateCallbacks[0].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['responses.testFields.fieldA'], 'testFields.fieldA')
        } else {
            expect(updateCallbacks[0].callback).not.toHaveBeenCalled();
        }
    });
});

describe('Field with placeholder and regex', () => {
    test('Field in valuesByPath, should return updated value', async () => {
        const valuesByPath = { 'responses.household.persons.1.origin': 'foo' };
        expect(await updateServerFields(interviewAttributes, updateCallbacks, valuesByPath, [])).toEqual({ 'responses.household.persons.1.new': 'FOO'});
        expect(updateCallbacks[1].callback).toHaveBeenCalledWith(interviewAttributes, valuesByPath['responses.household.persons.1.origin'], 'household.persons.1.origin')
    });

    test('Field in unsetPath, should return updated value', async() => {
        const unsetPath = [ 'responses.household.persons.2.origin' ];
        expect(await updateServerFields(interviewAttributes, updateCallbacks, {}, unsetPath)).toEqual({ 'responses.household.persons.2.new': 'FOO'});
        expect(updateCallbacks[1].callback).toHaveBeenCalledWith(interviewAttributes, undefined, 'household.persons.2.origin')

    });
});

test('No field update callbacks', async () => {
    expect(await updateServerFields(interviewAttributes, [], { someField: 'abc' }, [])).toEqual({});
});

test('Test with exceptions', async () => {
    updateCallbacks[0].callback.mockRejectedValueOnce('error');
    updateCallbacks[0].callback.mockRejectedValueOnce('error');
    expect(await updateServerFields(interviewAttributes, updateCallbacks, { 'responses.testFields.fieldA': 'foo' }, [])).toEqual({});
    expect(await updateServerFields(interviewAttributes, updateCallbacks, { }, ['responses.testFields.fieldA'])).toEqual({});
});

describe('getPreFilledValuesByPath', () => {

    beforeEach(() => {
        mockGetByReferenceValue.mockClear();
    });

    test('Return undefined responses', async() => {
        mockGetByReferenceValue.mockResolvedValueOnce(undefined);
        const preFilledValuesByPath = await getPreFilledResponsesByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({});
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });

    test('Return fields that are not in the interview', async () => {
        const preFilledResponse = { 
            'testFields.fieldC': { value: 'abc' },
            'otherField': { value: 3 }
        };
        mockGetByReferenceValue.mockResolvedValueOnce(preFilledResponse);
        const preFilledValuesByPath = await getPreFilledResponsesByPath('test', interviewAttributes);
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
        const preFilledValuesByPath = await getPreFilledResponsesByPath('test', interviewAttributes);
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
        const preFilledValuesByPath = await getPreFilledResponsesByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({});
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });

    test('Exception getting the values', async() => {
        mockGetByReferenceValue.mockRejectedValueOnce('error');
        const preFilledValuesByPath = await getPreFilledResponsesByPath('test', interviewAttributes);
        expect(preFilledValuesByPath).toEqual({});
        expect(mockGetByReferenceValue).toHaveBeenLastCalledWith('test');
    });
});

describe('setPreFilledResponses', () => {

    const preFilledResponse = { 
        'testFields.fieldC': { value: 'abc' },
        'otherField': { value: 3 }
    };

    beforeEach(() => {
        mockSetPreFilledResponsesForRef.mockClear();
    });

    test('Setting prefilled responses', async () => {
        mockSetPreFilledResponsesForRef.mockResolvedValueOnce(true);
        await setPreFilledResponses('test', preFilledResponse);
        expect(mockSetPreFilledResponsesForRef).toHaveBeenLastCalledWith('test', preFilledResponse);
    });

    test('Exception setting the values', async() => {
        mockSetPreFilledResponsesForRef.mockRejectedValueOnce('error');
        await setPreFilledResponses('test', preFilledResponse);
        expect(mockSetPreFilledResponsesForRef).toHaveBeenLastCalledWith('test', preFilledResponse);
    });
});