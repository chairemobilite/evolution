/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { mapResponseToValidatedData } from '../interviewUtils';

describe('mapResponseToValidatedData', () => {
    test('Response object', () => {
        const valuesByPath = {
            response: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false }, response: false }
        };
        const unsetPaths = [ 'response', 'validations' ];

        const { valuesByPath: updatedValues, unsetPaths: updatedUnsetPaths } =
            mapResponseToValidatedData(valuesByPath, unsetPaths);

        expect(updatedValues).toEqual({
            validated_data: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false }, response: false }
        });
        expect(updatedUnsetPaths).toEqual(['validated_data', 'validations']);
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
            mapResponseToValidatedData(valuesByPath, unsetPaths);

        expect(updatedValues).toEqual({
            'validated_data.accessCode': '2222',
            'validated_data.newField.foo': 'bar',
            'validations.accessCode.is_valid': false,
            'validations.response': false,
            'response2.notToBeModified': true,
            'response2': 'notToBeModified'
        });
        expect(updatedUnsetPaths).toEqual(['validated_data.accessCode', 'response2', 'response2.notToBeModified']);
    });
});
