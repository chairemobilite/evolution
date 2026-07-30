/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { applyInterviewValuesByPath } from '../applyInterviewValuesByPath';

describe('applyInterviewValuesByPath', () => {
    test('sets values by path with deep string paths', () => {
        const interview = {
            response: { accessCode: '1111', testFields: { fieldA: 'a', fieldB: 'b' } },
            validations: {}
        };
        applyInterviewValuesByPath(interview, {
            valuesByPath: {
                'response.accessCode': '2222',
                'validations.accessCode': { is_valid: false },
                'response.newField.foo': 'bar'
            }
        });
        expect(interview).toEqual({
            response: {
                accessCode: '2222',
                testFields: { fieldA: 'a', fieldB: 'b' },
                newField: { foo: 'bar' }
            },
            validations: { accessCode: { is_valid: false } }
        });
    });

    test('sets whole objects by path', () => {
        const interview = { response: { accessCode: '1111' }, validations: {} };
        applyInterviewValuesByPath(interview, {
            valuesByPath: {
                response: { accessCode: '2222', newField: { foo: 'bar' } },
                validations: { accessCode: { is_valid: false } }
            }
        });
        expect(interview).toEqual({
            response: { accessCode: '2222', newField: { foo: 'bar' } },
            validations: { accessCode: { is_valid: false } }
        });
    });

    test('unsets paths from unsetPaths', () => {
        const interview = { response: { keep: true, remove: true } };
        applyInterviewValuesByPath(interview, {
            unsetPaths: ['response.remove']
        });
        expect(interview).toEqual({ response: { keep: true } });
    });

    test('unsets paths when valuesByPath value is undefined', () => {
        const personUuid = 'person-uuid';
        const interview = {
            response: {
                household: {
                    persons: {
                        [personUuid]: { age: 30 }
                    }
                }
            }
        };
        applyInterviewValuesByPath(interview, {
            valuesByPath: { [`response.household.persons.${personUuid}`]: undefined }
        });
        expect(Object.keys(interview.response.household.persons)).toEqual([]);
    });

    test('applies valuesByPath and unsetPaths together', () => {
        const interview = {
            response: { accessCode: '1111', testFields: { fieldA: 'a', fieldB: 'b' } },
            validations: {}
        };
        applyInterviewValuesByPath(interview, {
            valuesByPath: { 'response.accessCode': '2222', 'response.newField.foo': 'bar' },
            unsetPaths: ['response.testFields.fieldA']
        });
        expect(interview).toEqual({
            response: {
                accessCode: '2222',
                testFields: { fieldB: 'b' },
                newField: { foo: 'bar' }
            },
            validations: {}
        });
    });

    test('applies valuesByPath before unsetPaths when paths overlap', () => {
        const interview = { response: { field: 'old' } };
        applyInterviewValuesByPath(interview, {
            valuesByPath: { 'response.field': 'new' },
            unsetPaths: ['response.field']
        });
        expect(interview).toEqual({ response: {} });
    });

    test('removes parent after deep valuesByPath update without leaving trailing data', () => {
        const personUuid = 'person-uuid';
        const interview = {
            response: {
                household: {
                    persons: {
                        [personUuid]: { age: 30, trips: { trip1: { arrivalTime: '08:00' } } }
                    }
                }
            }
        };
        applyInterviewValuesByPath(interview, {
            valuesByPath: {
                [`response.household.persons.${personUuid}.trips.trip1.arrivalTime`]: '09:00'
            },
            unsetPaths: [`response.household.persons.${personUuid}`]
        });
        expect(Object.keys(interview.response.household.persons)).toEqual([]);
    });

    test('sets root values and unsets nested paths', () => {
        const interview = {
            is_valid: true,
            is_active: true,
            is_completed: false,
            response: { accessCode: '1111' },
            validations: {}
        };
        applyInterviewValuesByPath(interview, {
            valuesByPath: { is_valid: false, is_active: false },
            unsetPaths: ['response']
        });
        expect(interview).toEqual({
            is_valid: false,
            is_active: false,
            is_completed: false,
            validations: {}
        });
    });
});
