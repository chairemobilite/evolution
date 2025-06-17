/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';
import { updateInterview, setInterviewFields, copyResponseToCorrectedResponse } from '../interview';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import interviewsQueries from '../../../models/interviews.db.queries';
import serverValidate from '../../validations/serverValidation';
import serverUpdate from '../serverFieldUpdate';
import config from 'chaire-lib-backend/lib/config/server.config';
import { registerServerUpdateCallbacks } from '../../../config/projectConfig';
import TestUtils from 'chaire-lib-common/lib/test/TestUtils';
import { ParadataLoggingFunction } from '../../logging/paradataLogging';

jest.mock('../../validations/serverValidation', () =>
    jest.fn()
);
const mockedServerValidate = serverValidate as jest.MockedFunction<typeof serverValidate>;
mockedServerValidate.mockResolvedValue(true);

jest.mock('../serverFieldUpdate', () =>
    jest.fn()
);
const mockedServerUpdate = serverUpdate as jest.MockedFunction<typeof serverUpdate>;
mockedServerUpdate.mockResolvedValue([{}, undefined]);

jest.mock('../../../models/interviews.db.queries', () => ({
    update: jest.fn(),
    getInterviewByUuid: jest.fn()
}));
const mockUpdate = interviewsQueries.update as jest.MockedFunction<typeof interviewsQueries.update>;
const mockGetInterviewByUuid = interviewsQueries.getInterviewByUuid as jest.MockedFunction<typeof interviewsQueries.getInterviewByUuid>;

const mockLog = jest.fn() as jest.MockedFunction<ParadataLoggingFunction>;

const interviewAttributes: InterviewAttributes = {
    uuid: uuidV4(),
    id: 4,
    participant_id: 4,
    is_valid: true,
    is_active: true,
    is_completed: false,
    response: {
        accessCode: '11111',
        testFields: {
            fieldA: 'a',
            fieldB: 'b'
        }
    } as any,
    survey_id: 1,
    validations: {}
};
(interviewsQueries.update as any).mockResolvedValue({ uuid: interviewAttributes.uuid });

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Set interview fields', () => {

    test('Test with valuesByPath with deep string path', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            'response.accessCode': '2222',
            'validations.accessCode': { is_valid: false },
            'response.newField.foo': 'bar'
        };
        setInterviewFields(testAttributes, { valuesByPath });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: interviewAttributes.is_valid,
            is_active: interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            response: {
                accessCode: '2222',
                testFields: {
                    fieldA: 'a',
                    fieldB: 'b'
                },
                newField: { foo: 'bar' }
            },
            validations: {
                accessCode: { is_valid: false }
            },
            survey_id: 1
        });
    });

    test('Test with objects', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            response: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false } }
        };
        setInterviewFields(testAttributes, { valuesByPath });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: interviewAttributes.is_valid,
            is_active: interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            response: {
                accessCode: '2222',
                newField: { foo: 'bar' }
            },
            validations: {
                accessCode: { is_valid: false }
            },
            survey_id: 1
        });
    });

    test('Test with valuesByPath and unsetPaths', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            'response.accessCode': '2222',
            'response.newField.foo': 'bar'
        };
        const unsetPaths = [ 'response.testFields.fieldA' ];
        setInterviewFields(testAttributes, { valuesByPath, unsetPaths });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: interviewAttributes.is_valid,
            is_active: interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            response: {
                accessCode: '2222',
                testFields: {
                    fieldB: 'b'
                },
                newField: { foo: 'bar' }
            },
            validations: {},
            survey_id: 1
        });
    });

    test('Test with root values', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            'is_valid': !interviewAttributes.is_valid,
            is_active: !interviewAttributes.is_active
        };
        const unsetPaths = [ 'response' ];
        setInterviewFields(testAttributes, { valuesByPath, unsetPaths });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: !interviewAttributes.is_valid,
            is_active: !interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            validations: {},
            survey_id: 1
        });
    });

});

describe('Update Interview', () => {

    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('With values by path', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const interview = await updateInterview(testAttributes, { valuesByPath: { 'response.foo': 'abc', 'response.testFields.fieldA': 'new' } });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        };
        expectedUpdatedValues.response.foo = 'abc';
        expectedUpdatedValues.response.testFields.fieldA = 'new';
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With values by path, and user action of type "buttonClick"', async() => {
        // Prepare test data
        const testAttributes = _cloneDeep(interviewAttributes);
        const userAction = { type: 'buttonClick' as const, buttonId: 'test' };
        const interview = await updateInterview(testAttributes, { userAction, valuesByPath: { 'response.foo': 'abc', 'response.testFields.fieldA': 'new' } });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        };
        expectedUpdatedValues.response.foo = 'abc';
        expectedUpdatedValues.response.testFields.fieldA = 'new';
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With values by path, unset path and user action of type "widgetInteraction"', async() => {
        // Prepare test data
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'response.foo': 'abc', 'corrected_response.foo': 'def' };
        const userAction = { type: 'widgetInteraction' as const, widgetType: 'string', path: 'response.bar', value: 100 };
        const expectedValuseByPath = { ['response.bar']: 100, ...valuesByPath };
        const unsetPaths = ['response.accessCode'];
        const interview = await updateInterview(testAttributes, { valuesByPath, unsetPaths, userAction });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, expectedValuseByPath, unsetPaths);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], expectedValuseByPath, unsetPaths, undefined);

        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        };
        expectedUpdatedValues.response.foo = 'abc';
        expectedUpdatedValues.response.bar = 100;
        delete expectedUpdatedValues.response.accessCode;
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('Specifying fields to update', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'corrected_response.foo': 'abc', 'response.bar': 'abc' };
        const interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['corrected_response'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, []);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], valuesByPath, undefined, undefined);

        const expectedUpdatedValues = {
            corrected_response: { foo: 'abc' },
        };
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With completed', async() => {
        // Test with true value
        let testAttributes = _cloneDeep(interviewAttributes);
        let valuesByPath = { 'is_completed': true };
        let interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['is_completed'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, []);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], { is_completed: true }, undefined, undefined);

        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, { is_completed: true, is_frozen: true });

        // Test with false value
        testAttributes = _cloneDeep(interviewAttributes);
        valuesByPath = { 'is_completed': false };
        interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['is_completed'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(2);

        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, { is_completed: false, is_frozen: true });

        // Test with null value
        testAttributes = _cloneDeep(interviewAttributes);
        valuesByPath = { 'is_completed': null } as any;
        interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['is_completed'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(3);

        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, { is_completed: null });
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With valid', async() => {
        // Test with true value
        let testAttributes = _cloneDeep(interviewAttributes);
        let valuesByPath = { 'is_valid': true };
        let interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['is_valid'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, []);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], { is_valid: true }, undefined, undefined);

        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, { is_valid: true, is_frozen: true });

        // Test with false value
        testAttributes = _cloneDeep(interviewAttributes);
        valuesByPath = { 'is_valid': false };
        interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['is_valid'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(2);

        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, { is_valid: false, is_frozen: true });

        // Test with null value
        testAttributes = _cloneDeep(interviewAttributes);
        valuesByPath = { 'is_valid': null } as any;
        interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['is_valid'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(3);

        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, { is_valid: null });
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With no field to be updated', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const interview = await updateInterview(testAttributes, { valuesByPath: { 'notAnInterviewField': 'abc' } });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        };
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With invalid server validations', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'response.foo': 'abc' };
        // Prepare server validations
        const serverValidations = {
            foo: {
                validations: [{
                    validation: (_val) => true,
                    errorMessage: { fr: 'erreur', en: 'error' }
                }]
            }
        };
        const serverValidationErrors = { foo: serverValidations.foo.validations[0].errorMessage };
        mockedServerValidate.mockResolvedValueOnce(serverValidationErrors);
        const interview = await updateInterview(testAttributes, { valuesByPath, serverValidations });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(serverValidationErrors);

        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, serverValidations, valuesByPath, []);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], valuesByPath, undefined, undefined);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations) as any
        };
        expectedUpdatedValues.response.foo = 'abc';
        expectedUpdatedValues.validations.foo = false;
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With server field updates', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'response.testFields.fieldB': 'abc', 'response.testFields.fieldA': 'clientVal', 'validations.testFields.fieldA': true };
        const unsetPaths = ['response.accessCode'];
        // Prepare server update response, callbacks won't be called, but we need an object
        const updateCallbacks = [
            { field: 'testFields.fieldA', callback: jest.fn().mockResolvedValue({}) }
        ];
        registerServerUpdateCallbacks(updateCallbacks);
        const updatedValuesByPath = { 'response.testFields.fieldB': 'newVal' };
        mockedServerUpdate.mockResolvedValueOnce([updatedValuesByPath, undefined]);
        const interview = await updateInterview(testAttributes, { valuesByPath, unsetPaths });
        registerServerUpdateCallbacks([]);
        expect(interview).toEqual({
            interviewId: testAttributes.uuid,
            serverValidations: true,
            serverValuesByPath: updatedValuesByPath,
            redirectUrl: undefined
        });

        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, unsetPaths);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, updateCallbacks, valuesByPath, unsetPaths, undefined);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations) as any
        };
        expectedUpdatedValues.response.testFields.fieldB = updatedValuesByPath['response.testFields.fieldB'];
        expectedUpdatedValues.response.testFields.fieldA = valuesByPath['response.testFields.fieldA'];
        delete expectedUpdatedValues.response.accessCode;
        expectedUpdatedValues.validations = { testFields: { fieldA: valuesByPath['validations.testFields.fieldA'] } };
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With server field updates and execution callback, with paradata logging', async() => {
        const deferredUpdateCallback = jest.fn();
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'response.testFields.fieldB': 'abc', 'response.testFields.fieldA': 'clientVal', 'validations.testFields.fieldA': true };
        const unsetPaths = ['response.accessCode'];

        // Prepare server update response, callbacks won't be called, but we need an object
        const updateCallbacks = [
            { field: 'testFields.fieldA', callback: jest.fn().mockResolvedValue({}) }
        ];
        registerServerUpdateCallbacks(updateCallbacks);
        const updatedValuesByPath = { 'response.testFields.fieldB': 'newVal' };
        const asyncUpdatedValuesByPath = { 'response.testFields.fieldC': 'valC' };
        // The mocked server update will call the execution callback once
        mockedServerUpdate.mockImplementationOnce(async (_i, _c, _v, _u, execCallback) => {
            execCallback!(asyncUpdatedValuesByPath);
            return [updatedValuesByPath, undefined];
        });
        // The first update should update with the received values and updated ones
        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations) as any
        };
        expectedUpdatedValues.response.testFields.fieldB = updatedValuesByPath['response.testFields.fieldB'];
        expectedUpdatedValues.response.testFields.fieldA = valuesByPath['response.testFields.fieldA'];
        delete expectedUpdatedValues.response.accessCode;
        expectedUpdatedValues.validations = { testFields: { fieldA: valuesByPath['validations.testFields.fieldA'] } };
        // When the interview will be reloaded, make sure it is with updated response
        const reloadedInterview = { ...testAttributes, response: expectedUpdatedValues.response, validations: expectedUpdatedValues.validations };
        mockGetInterviewByUuid.mockResolvedValueOnce(reloadedInterview);

        const interview = await updateInterview(testAttributes, { logUpdate: mockLog, valuesByPath, unsetPaths, deferredUpdateCallback });
        await TestUtils.flushPromises();
        registerServerUpdateCallbacks([]);
        expect(interview).toEqual({
            interviewId: testAttributes.uuid,
            serverValidations: true,
            serverValuesByPath: updatedValuesByPath,
            redirectUrl: undefined
        });

        expect(mockedServerValidate).toHaveBeenCalledTimes(2);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, unsetPaths);
        expect(mockedServerValidate).toHaveBeenCalledWith(reloadedInterview, undefined, asyncUpdatedValuesByPath, []);
        // Update should have been called twice, intially and after the execution callback call
        expect(mockedServerUpdate).toHaveBeenCalledTimes(2);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, updateCallbacks, valuesByPath, unsetPaths, expect.anything());
        expect(mockedServerUpdate).toHaveBeenCalledWith(reloadedInterview, updateCallbacks, asyncUpdatedValuesByPath, undefined, undefined);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(2);
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);

        // The second update should update with the received values and updated ones
        const asyncExpectedUpdatedValues = {
            response: _cloneDeep(expectedUpdatedValues.response) as any,
            validations: _cloneDeep(expectedUpdatedValues.validations) as any
        };
        asyncExpectedUpdatedValues.response.testFields.fieldC = asyncUpdatedValuesByPath['response.testFields.fieldC'];
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, asyncExpectedUpdatedValues);
        expect(mockLog).toHaveBeenCalledTimes(3);
        // Should have been called once with server false with original updated data
        expect(mockLog).toHaveBeenCalledWith({
            server: false,
            valuesByPath,
            unsetPaths
        });
        // Should have been called once with server flag and simple updated values by path
        expect(mockLog).toHaveBeenCalledWith({
            server: true,
            valuesByPath: updatedValuesByPath
        });
        // Should have been called once with server flag and async values by path
        expect(mockLog).toHaveBeenCalledWith({
            server: true,
            valuesByPath: asyncUpdatedValuesByPath
        });
    });

    test('With server field updates and redirect URL', async() => {
        const testRedirectURL = 'http://localhost:8080/test';
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'response.testFields.fieldB': 'abc', 'response.testFields.fieldA': 'clientVal', 'validations.testFields.fieldA': true };
        const unsetPaths = ['response.accessCode'];
        // Prepare server update response, callbacks won't be called, but we need an object
        const updateCallbacks = [
            { field: 'testFields.fieldA', callback: jest.fn().mockResolvedValue({}) }
        ];
        registerServerUpdateCallbacks(updateCallbacks);
        const updatedValuesByPath = { 'response.testFields.fieldB': 'newVal' };
        mockedServerUpdate.mockResolvedValueOnce([updatedValuesByPath, testRedirectURL]);
        const interview = await updateInterview(testAttributes, { valuesByPath, unsetPaths });
        registerServerUpdateCallbacks([]);
        expect(interview).toEqual({
            interviewId: testAttributes.uuid,
            serverValidations: true,
            serverValuesByPath: updatedValuesByPath,
            redirectUrl: testRedirectURL
        });

        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, unsetPaths);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, updateCallbacks, valuesByPath, unsetPaths, undefined);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        const expectedUpdatedValues = {
            response: _cloneDeep(interviewAttributes.response) as any,
            validations: _cloneDeep(interviewAttributes.validations) as any
        };
        expectedUpdatedValues.response.testFields.fieldB = updatedValuesByPath['response.testFields.fieldB'];
        expectedUpdatedValues.response.testFields.fieldA = valuesByPath['response.testFields.fieldA'];
        delete expectedUpdatedValues.response.accessCode;
        expectedUpdatedValues.validations = { testFields: { fieldA: valuesByPath['validations.testFields.fieldA'] } };
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        expect(mockLog).not.toHaveBeenCalled();
    });

    test('With logs', async() => {
        try {
            // Prepare data to update
            const updatedAt = 1234; // Update timestamp
            const testAttributes = _cloneDeep(interviewAttributes);
            const valuesByPath = { 'response.foo': 'abc' };
            testAttributes.response._updatedAt = updatedAt;

            // Do the update
            const interview = await updateInterview(testAttributes, { logUpdate: mockLog, valuesByPath });

            // Validate the resulting updates
            expect(interview.interviewId).toEqual(testAttributes.uuid);
            expect(interview.serverValidations).toEqual(true);
            expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

            const expectedUpdatedValues = {
                response: _cloneDeep(interviewAttributes.response) as any,
                validations: _cloneDeep(interviewAttributes.validations),
            };
            expectedUpdatedValues.response.foo = 'abc';
            expectedUpdatedValues.response._updatedAt = updatedAt;
            expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
            expect(mockLog).toHaveBeenCalledWith({ valuesByPath, server: false });
        } finally {
            (config as any).logDatabaseUpdates = false;
        }
    });

    test('With default logs', async() => {
        try {
            // Prepare data to update
            const updatedAt = 1234; // Update timestamp
            const testAttributes = _cloneDeep(interviewAttributes);
            const valuesByPath = { 'response.foo': 'abc' };
            testAttributes.response._updatedAt = updatedAt;

            // Do the update
            const interview = await updateInterview(testAttributes, { logUpdate: mockLog, valuesByPath, logData: { shouldBeInLog: 'test' } });

            // Validate the resulting updates
            expect(interview.interviewId).toEqual(testAttributes.uuid);
            expect(interview.serverValidations).toEqual(true);
            expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

            const expectedUpdatedValues = {
                response: _cloneDeep(interviewAttributes.response) as any,
                validations: _cloneDeep(interviewAttributes.validations)
            };
            expectedUpdatedValues.response.foo = 'abc';
            expectedUpdatedValues.response._updatedAt = updatedAt;
            expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
            expect(mockLog).toHaveBeenCalledWith({ valuesByPath, server: false });
        } finally {
            (config as any).logDatabaseUpdates = false;
        }
    });

    test('Database error', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        (interviewsQueries.update as any).mockRejectedValueOnce('fake error');

        let error: unknown = undefined;
        try {
            await updateInterview(testAttributes,
                {
                    valuesByPath: { 'response.foo': 'abc', 'response.testFields.fieldA': 'new' }
                }
            );
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();

    });

    test('Database error and logging', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        (interviewsQueries.update as any).mockRejectedValueOnce('fake error');

        let error: unknown = undefined;
        try {
            await updateInterview(testAttributes,
                {
                    logUpdate: mockLog,
                    valuesByPath: { 'response.foo': 'abc', 'response.testFields.fieldA': 'new' }
                }
            );
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();
        expect(mockLog).not.toHaveBeenCalled();

    });

});

describe('copyResponseToCorrectedResponse', () => {

    beforeEach(async () => {
        mockUpdate.mockClear();
    });

    test('First copy', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);

        expect(testAttributes.corrected_response).not.toBeDefined();
        await copyResponseToCorrectedResponse(testAttributes);
        expect(testAttributes.corrected_response).toEqual(expect.objectContaining(testAttributes.response));
        expect(testAttributes.corrected_response?._correctedResponseCopiedAt).toBeDefined();
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(testAttributes.uuid, { corrected_response: testAttributes.corrected_response });
    });

    test('Copy with existing validation data', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const originalTimestamp = moment('2023-09-12 15:02:00').unix();
        testAttributes.corrected_response = {
            _correctedResponseCopiedAt: originalTimestamp,
            accessCode: '2222',
            testFields: {
                fieldA: 'test',
                fieldB: 'changed'
            }
        } as any,

        await copyResponseToCorrectedResponse(testAttributes);
        expect(testAttributes.corrected_response).toEqual(expect.objectContaining(testAttributes.response));
        expect(testAttributes.corrected_response?._correctedResponseCopiedAt).toBeDefined();
        expect(testAttributes.corrected_response?._correctedResponseCopiedAt).not.toEqual(originalTimestamp);
        expect(mockUpdate).toHaveBeenCalledWith(testAttributes.uuid, { corrected_response: testAttributes.corrected_response });
    });

    test('Copy with existing and comment', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const originalTimestamp = moment('2023-09-12 15:02:00').unix();

        const validationComment = 'This was commented previously';
        testAttributes.corrected_response = {
            _correctedResponseCopiedAt: originalTimestamp,
            accessCode: '2222',
            testFields: {
                fieldA: 'test',
                fieldB: 'changed'
            },
            _validationComment: validationComment
        } as any,

        await copyResponseToCorrectedResponse(testAttributes);
        expect(testAttributes.corrected_response).toEqual(expect.objectContaining(testAttributes.response));
        expect(testAttributes.corrected_response?._validationComment).toEqual(validationComment);
        expect(testAttributes.corrected_response?._correctedResponseCopiedAt).toBeDefined();
        expect(mockUpdate).toHaveBeenCalledWith(testAttributes.uuid, { corrected_response: testAttributes.corrected_response });
    });

});
