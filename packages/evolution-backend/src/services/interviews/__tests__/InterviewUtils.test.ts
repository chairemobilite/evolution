/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { mapResponseToCorrectedResponse } from '../interviewUtils';

describe('mapResponseToCorrectedResponse', () => {
    test('Response object', () => {
        const valuesByPath = {
            response: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false }, response: false }
        };
        const unsetPaths = [ 'response', 'validations' ];

        const { valuesByPath: updatedValues, unsetPaths: updatedUnsetPaths } =
            mapResponseToCorrectedResponse(valuesByPath, unsetPaths);

        expect(updatedValues).toEqual({
            corrected_response: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false }, response: false }
        });
        expect(updatedUnsetPaths).toEqual(['corrected_response', 'validations']);
    });

    test('Response depp strings', () => {
        const valuesByPath = {
            'response.accessCode': '2222',
            'response.newField.foo': 'bar',
            'validations.accessCode.is_valid': false,
            'validations.response': false,
            'response2.notToBeModified': true,
            'response2': 'notToBeModified'
        };
        const unsetPaths = [ 'response.accessCode', 'response2', 'response2.notToBeModified' ];

        const { valuesByPath: updatedValues, unsetPaths: updatedUnsetPaths } =
            mapResponseToCorrectedResponse(valuesByPath, unsetPaths);

        expect(updatedValues).toEqual({
            'corrected_response.accessCode': '2222',
            'corrected_response.newField.foo': 'bar',
            'validations.accessCode.is_valid': false,
            'validations.response': false,
            'response2.notToBeModified': true,
            'response2': 'notToBeModified'
        });
        expect(updatedUnsetPaths).toEqual(['corrected_response.accessCode', 'response2', 'response2.notToBeModified']);
    });
});
