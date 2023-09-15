/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash.clonedeep';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';
import { updateInterview, setInterviewFields, copyResponsesToValidatedData } from '../interview';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import interviewsQueries from '../../../models/interviews.db.queries';
import serverValidate from '../../validations/serverValidation';
import serverUpdate from '../serverFieldUpdate';
import config from 'chaire-lib-backend/lib/config/server.config';
import { registerServerUpdateCallbacks } from '../../../config/projectConfig';

jest.mock('../../validations/serverValidation', () =>
    jest.fn().mockResolvedValue(true)
);
const mockedServerValidate = serverValidate as jest.MockedFunction<typeof serverValidate>;
jest.mock('../serverFieldUpdate', () =>
    jest.fn().mockResolvedValue({})
);
const mockedServerUpdate = serverUpdate as jest.MockedFunction<typeof serverUpdate>;

jest.mock('../../../models/interviews.db.queries', () => ({
    update: jest.fn()
}));
const mockUpdate = interviewsQueries.update as jest.MockedFunction<typeof interviewsQueries.update>;

type CustomSurvey = {
    accessCode: string;
    testFields: {
        fieldA: string;
        fieldB: string;
    }
}

const interviewAttributes: InterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
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
(interviewsQueries.update as any).mockResolvedValue({ uuid: interviewAttributes.uuid });

describe('Set interview fields', () => {

    test('Test with valuesByPath with deep string path', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            'responses.accessCode': '2222',
            'validations.accessCode': { is_valid: false },
            'responses.newField.foo': 'bar'
        }
        setInterviewFields(testAttributes, { valuesByPath });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: interviewAttributes.is_valid,
            is_active: interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            logs: interviewAttributes.logs,
            responses: {
                accessCode: '2222',
                testFields: {
                    fieldA: 'a',
                    fieldB: 'b'
                },
                newField: { foo: 'bar' }
            },
            validations: {
                accessCode: { is_valid: false }
            }
        });
    });

    test('Test with objects', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            responses: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false } }
        }
        setInterviewFields(testAttributes, { valuesByPath });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: interviewAttributes.is_valid,
            is_active: interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            logs: interviewAttributes.logs,
            responses: {
                accessCode: '2222',
                newField: { foo: 'bar' }
            },
            validations: {
                accessCode: { is_valid: false }
            }
        });
    });

    test('Test with valuesByPath and unsetPaths', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            'responses.accessCode': '2222',
            'responses.newField.foo': 'bar'
        }
        const unsetPaths = [ 'responses.testFields.fieldA' ];
        setInterviewFields(testAttributes, { valuesByPath, unsetPaths });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: interviewAttributes.is_valid,
            is_active: interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            logs: interviewAttributes.logs,
            responses: {
                accessCode: '2222',
                testFields: {
                    fieldB: 'b'
                },
                newField: { foo: 'bar' }
            },
            validations: {}
        });
    });

    test('Test with root values', () => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = {
            'is_valid': !interviewAttributes.is_valid,
            is_active: !interviewAttributes.is_active
        }
        const unsetPaths = [ 'responses' ];
        setInterviewFields(testAttributes, { valuesByPath, unsetPaths });
        expect(testAttributes).toEqual({
            uuid: interviewAttributes.uuid,
            id: interviewAttributes.id,
            participant_id: interviewAttributes.participant_id,
            is_valid: !interviewAttributes.is_valid,
            is_active: !interviewAttributes.is_active,
            is_completed: interviewAttributes.is_completed,
            logs: interviewAttributes.logs,
            validations: {}
        });
    });

});

describe('Update Interview', () => {

    beforeEach(async () => {
        (interviewsQueries.update as any).mockClear();
        mockedServerValidate.mockClear();
        mockedServerUpdate.mockClear();
    });

    test('With values by path', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const interview = await updateInterview(testAttributes, { valuesByPath: { 'responses.foo': 'abc', 'responses.testFields.fieldA': 'new' } });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

        const expectedUpdatedValues = {
            responses: _cloneDeep(interviewAttributes.responses) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        }
        expectedUpdatedValues.responses.foo = 'abc';
        expectedUpdatedValues.responses.testFields.fieldA = 'new';
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
    });

    test('With values by path and unset path', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'responses.foo': 'abc', 'validated_data.foo': 'def' };
        const unsetPaths = ['responses.accessCode'];
        const interview = await updateInterview(testAttributes, { valuesByPath, unsetPaths });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, unsetPaths);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], valuesByPath, unsetPaths);

        const expectedUpdatedValues = {
            responses: _cloneDeep(interviewAttributes.responses) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        }
        expectedUpdatedValues.responses.foo = 'abc';
        delete expectedUpdatedValues.responses.accessCode;
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
    });

    test('Specifying fields to update', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'validated_data.foo': 'abc', 'responses.bar': 'abc' };
        const interview = await updateInterview(testAttributes, { valuesByPath, fieldsToUpdate: ['validated_data'] });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, []);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], valuesByPath, undefined);

        const expectedUpdatedValues = {
            validated_data: { foo: 'abc' },
        }
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
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
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], { is_completed: true }, undefined);

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
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], { is_valid: true }, undefined);

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
    });

    test('With no field to be updated', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const interview = await updateInterview(testAttributes, { valuesByPath: { 'notAnInterviewField': 'abc' } });
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

        const expectedUpdatedValues = {
            responses: _cloneDeep(interviewAttributes.responses) as any,
            validations: _cloneDeep(interviewAttributes.validations)
        }
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
    });

    test('With invalid server validations', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'responses.foo': 'abc' };
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
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, [], valuesByPath, undefined);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        const expectedUpdatedValues = {
            responses: _cloneDeep(interviewAttributes.responses) as any,
            validations: _cloneDeep(interviewAttributes.validations) as any
        }
        expectedUpdatedValues.responses.foo = 'abc';
        expectedUpdatedValues.validations.foo = false;
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
    });

    test('With server field updates', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const valuesByPath = { 'responses.testFields.fieldB': 'abc', 'responses.testFields.fieldA': 'clientVal', 'validations.testFields.fieldA': true };
        const unsetPaths = ['responses.accessCode'];
        // Prepare server update responses, callbacks won't be called, but we need an object
        const updateCallbacks = [
            { field: 'testFields.fieldA', callback: jest.fn().mockResolvedValue({}) }
        ]
        registerServerUpdateCallbacks(updateCallbacks);
        const updatedValuesByPath = { 'responses.testFields.fieldB': 'newVal' }
        mockedServerUpdate.mockResolvedValueOnce(updatedValuesByPath);
        const interview = await updateInterview(testAttributes, { valuesByPath, unsetPaths });
        registerServerUpdateCallbacks([]);
        expect(interview.interviewId).toEqual(testAttributes.uuid);
        expect(interview.serverValidations).toEqual(true);
        expect(interview.serverValuesByPath).toEqual(updatedValuesByPath);

        expect(mockedServerValidate).toHaveBeenCalledTimes(1);
        expect(mockedServerValidate).toHaveBeenCalledWith(testAttributes, undefined, valuesByPath, unsetPaths);
        expect(mockedServerUpdate).toHaveBeenCalledTimes(1);
        expect(mockedServerUpdate).toHaveBeenCalledWith(testAttributes, updateCallbacks, valuesByPath, unsetPaths);
        expect(interviewsQueries.update).toHaveBeenCalledTimes(1);
        const expectedUpdatedValues = {
            responses: _cloneDeep(interviewAttributes.responses) as any,
            validations: _cloneDeep(interviewAttributes.validations) as any
        }
        expectedUpdatedValues.responses.testFields.fieldB = updatedValuesByPath['responses.testFields.fieldB'];
        expectedUpdatedValues.responses.testFields.fieldA = valuesByPath['responses.testFields.fieldA'];
        delete expectedUpdatedValues.responses.accessCode;
        expectedUpdatedValues.validations = { testFields: { fieldA: valuesByPath['validations.testFields.fieldA'] } };
        expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
    });

    test('With logs', async() => {
        config.logDatabaseUpdates = true;
        try {
            const updatedAt = 1234; // Update timestamp
            const testAttributes = _cloneDeep(interviewAttributes);
            const valuesByPath = { 'responses.foo': 'abc' };
            testAttributes.responses._updatedAt = updatedAt;
            testAttributes.logs = [{
                timestamp: 12,
                valuesByPath: {}
            }];
            const interview = await updateInterview(testAttributes, { valuesByPath });
            expect(interview.interviewId).toEqual(testAttributes.uuid);
            expect(interview.serverValidations).toEqual(true);
            expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

            const expectedUpdatedValues = {
                responses: _cloneDeep(interviewAttributes.responses) as any,
                validations: _cloneDeep(interviewAttributes.validations),
                logs: [{
                    timestamp: 12,
                    valuesByPath: {}
                },
                {
                    timestamp: updatedAt,
                    valuesByPath
                }]
            }
            expectedUpdatedValues.responses.foo = 'abc';
            expectedUpdatedValues.responses._updatedAt = updatedAt;
            expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        } finally {
            config.logDatabaseUpdates = false;
        }
    });

    test('With default logs', async() => {
        config.logDatabaseUpdates = true;
        try {
            const updatedAt = 1234; // Update timestamp
            const testAttributes = _cloneDeep(interviewAttributes);
            const valuesByPath = { 'responses.foo': 'abc' };
            testAttributes.responses._updatedAt = updatedAt;
            testAttributes.logs = [{
                timestamp: 12,
                valuesByPath: {}
            }];
            const interview = await updateInterview(testAttributes, { valuesByPath, logData: { shouldBeInLog: 'test' } });
            expect(interview.interviewId).toEqual(testAttributes.uuid);
            expect(interview.serverValidations).toEqual(true);
            expect(interviewsQueries.update).toHaveBeenCalledTimes(1);

            const expectedUpdatedValues = {
                responses: _cloneDeep(interviewAttributes.responses) as any,
                validations: _cloneDeep(interviewAttributes.validations),
                logs: [{
                    timestamp: 12,
                    valuesByPath: {}
                },
                {
                    shouldBeInLog: 'test',
                    timestamp: updatedAt,
                    valuesByPath
                }]
            }
            expectedUpdatedValues.responses.foo = 'abc';
            expectedUpdatedValues.responses._updatedAt = updatedAt;
            expect(interviewsQueries.update).toHaveBeenCalledWith(testAttributes.uuid, expectedUpdatedValues);
        } finally {
            config.logDatabaseUpdates = false;
        }
    });

    test('Database error', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        (interviewsQueries.update as any).mockRejectedValueOnce('fake error');

        let error: unknown = undefined;
        try {
            await updateInterview(testAttributes,
                {
                    valuesByPath: { 'responses.foo': 'abc', 'responses.testFields.fieldA': 'new' }
                }
            );
        } catch (err) {
            error = err;
        }
        expect(error).toBeDefined();

    });

});

describe('copyResponsesToValidatedData', () => {

    beforeEach(async () => {
        mockUpdate.mockClear();
    });

    test('First copy', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);

        expect(testAttributes.validated_data).not.toBeDefined();
        await copyResponsesToValidatedData(testAttributes);
        expect(testAttributes.validated_data).toEqual(expect.objectContaining(testAttributes.responses));
        expect(testAttributes.validated_data?._validatedDataCopiedAt).toBeDefined();
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(testAttributes.uuid, { validated_data: testAttributes.validated_data });
    });

    test('Copy with existing validation data', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const originalTimestamp = moment('2023-09-12 15:02:00').unix();
        testAttributes.validated_data = {
            _validatedDataCopiedAt: originalTimestamp,
            accessCode: '2222',
            testFields: {
                fieldA: 'test',
                fieldB: 'changed'
            }
        },

        await copyResponsesToValidatedData(testAttributes);
        expect(testAttributes.validated_data).toEqual(expect.objectContaining(testAttributes.responses));
        expect(testAttributes.validated_data?._validatedDataCopiedAt).toBeDefined();
        expect(testAttributes.validated_data?._validatedDataCopiedAt).not.toEqual(originalTimestamp);
        expect(mockUpdate).toHaveBeenCalledWith(testAttributes.uuid, { validated_data: testAttributes.validated_data });
    });

    test('Copy with existing and comment', async() => {
        const testAttributes = _cloneDeep(interviewAttributes);
        const originalTimestamp = moment('2023-09-12 15:02:00').unix();

        const validationComment = 'This was commented previously';
        testAttributes.validated_data = {
            _validatedDataCopiedAt: originalTimestamp,
            accessCode: '2222',
            testFields: {
                fieldA: 'test',
                fieldB: 'changed'
            },
            _validationComment: validationComment
        },

        await copyResponsesToValidatedData(testAttributes);
        expect(testAttributes.validated_data).toEqual(expect.objectContaining(testAttributes.responses));
        expect(testAttributes.validated_data._validationComment).toEqual(validationComment);
        expect(testAttributes.validated_data?._validatedDataCopiedAt).toBeDefined();
        expect(mockUpdate).toHaveBeenCalledWith(testAttributes.uuid, { validated_data: testAttributes.validated_data });
    });

});