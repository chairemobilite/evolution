/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { mapResponsesToValidatedData } from '../interviewUtils';

describe('mapResponsesToValidatedData', () => {
    test('Responses object', () => {
        const valuesByPath = {
            responses: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false }, responses: false }
        };
        const unsetPaths = [ 'responses', 'validations' ];

        const { valuesByPath: updatedValues, unsetPaths: updatedUnsetPaths } =
            mapResponsesToValidatedData(valuesByPath, unsetPaths);

        expect(updatedValues).toEqual({
            validated_data: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false }, responses: false }
        });
        expect(updatedUnsetPaths).toEqual(['validated_data', 'validations']);
    });

    test('Responses depp strings', () => {
        const valuesByPath = {
            'responses.accessCode': '2222',
            'responses.newField.foo': 'bar',
            'validations.accessCode.is_valid': false,
            'validations.responses': false,
            'responses2.notToBeModified': true,
            'responses2': 'notToBeModified'
        };
        const unsetPaths = [ 'responses.accessCode', 'responses2', 'responses2.notToBeModified' ];

        const { valuesByPath: updatedValues, unsetPaths: updatedUnsetPaths } =
            mapResponsesToValidatedData(valuesByPath, unsetPaths);

        expect(updatedValues).toEqual({
            'validated_data.accessCode': '2222',
            'validated_data.newField.foo': 'bar',
            'validations.accessCode.is_valid': false,
            'validations.responses': false,
            'responses2.notToBeModified': true,
            'responses2': 'notToBeModified'
        });
        expect(updatedUnsetPaths).toEqual(['validated_data.accessCode', 'responses2', 'responses2.notToBeModified']);
    });
})
