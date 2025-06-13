/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { mapResponseToCorrectedResponse, handleUserActionSideEffect } from '../interviewUtils';
import moment from 'moment';

// Mock moment.unix to return a consistent value for testing
jest.mock('moment', () => {
    const mockMoment = jest.fn(() => ({
        unix: jest.fn(() => 1234567890)
    })) as any;
    mockMoment.unix = jest.fn(() => mockMoment());
    return mockMoment;
});

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

describe('handleUserActionSideEffect', () => {
    test('sectionChange action without iteration context', () => {
        const interview = {
            id: 'interview-1',
            response: {
                _sections: {
                    _actions: [
                        { section: 'section1', action: 'start', ts: 1234567880 }
                    ]
                }
            }
        } as any;

        const valuesByPath = {};

        const userAction = {
            type: 'sectionChange' as const,
            targetSection: {
                sectionShortname: 'section2'
            },
            previousSection: {
                sectionShortname: 'section1'
            }
        };

        const result = handleUserActionSideEffect(interview, _cloneDeep(valuesByPath), userAction);

        expect(result).toEqual({
            'response._sections.section2._startedAt': 1234567890,
            'response._sections.section1._isCompleted': true,
            'response._sections._actions': [
                { section: 'section1', action: 'start', ts: 1234567880 },
                { section: 'section2', action: 'start', ts: 1234567890 }
            ]
        });
    });

    test('sectionChange action with iteration context', () => {
        const interview = {
            id: 'interview-1',
            response: {
                _sections: {
                    _actions: [
                        { section: 'section1', iterationContext: ['0'], action: 'start', ts: 1234567880 }
                    ]
                }
            }
        } as any;

        const valuesByPath = { 'response.someField': 'someValue', 'validations.someField': true };

        const userAction = {
            type: 'sectionChange' as const,
            targetSection: {
                sectionShortname: 'section2',
                iterationContext: ['person', '1']
            },
            previousSection: {
                sectionShortname: 'section1',
                iterationContext: ['0']
            }
        };

        const result = handleUserActionSideEffect(interview, _cloneDeep(valuesByPath), userAction);

        expect(result).toEqual({
            ...valuesByPath,
            'response._sections.section2._startedAt': 1234567890,
            'response._sections.section2.person/1._startedAt': 1234567890,
            'response._sections.section1.0._isCompleted': true,
            'response._sections._actions': [
                { section: 'section1', iterationContext: ['0'], action: 'start', ts: 1234567880 },
                { section: 'section2', iterationContext: ['person', '1'], action: 'start', ts: 1234567890 }
            ]
        });
    });

    test('widgetInteraction action (should not modify values)', () => {
        const interview = {
            id: 'interview-1',
            response: {}
        } as any;

        const valuesByPath = {
            'response.someField2': 'someValue'
        };

        const userAction = {
            type: 'widgetInteraction' as const,
            widgetType: 'string',
            path: 'response.someField',
            value: 'newValue'
        };

        const result = handleUserActionSideEffect(interview, _cloneDeep(valuesByPath), userAction);

        // Should return the same valuesByPath without modification
        expect(result).toEqual(valuesByPath);
    });

    test('sectionChange action with no previous section', () => {
        const interview = {
            id: 'interview-1',
            response: {}
        } as any;

        const valuesByPath = {};

        const userAction = {
            type: 'sectionChange' as const,
            targetSection: {
                sectionShortname: 'section1'
            }
            // No previousSection
        };

        const result = handleUserActionSideEffect(interview, _cloneDeep(valuesByPath), userAction);

        expect(result).toEqual({
            'response._sections.section1._startedAt': 1234567890,
            'response._sections._actions': [
                { section: 'section1', action: 'start', ts: 1234567890 }
            ]
        });
    });

    test('languageChange action', () => {
        const interview = {
            id: 'interview-1',
            response: {}
        } as any;

        const valuesByPath = { 'response.someField': 'someValue' };

        const userAction = {
            type: 'languageChange' as const,
            language: 'fr'
        };

        const result = handleUserActionSideEffect(interview, _cloneDeep(valuesByPath), userAction);

        expect(result).toEqual({
            ...valuesByPath,
            'response._language': 'fr'
        });
    });
});
