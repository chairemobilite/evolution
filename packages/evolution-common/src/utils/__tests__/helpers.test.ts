/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import _cloneDeep from 'lodash.clonedeep';
import { UserInterviewAttributes } from '../../services/interviews/interview';

import * as Helpers from '../helpers';

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
}

test('devLog', () => {
    // Not really a test, just make sure it does not throw
    Helpers.devLog({ a: 'foo' }, 3, 'evolution');
});

each([
    ['3', 'integer', 3],
    ['3.4', 'integer', 3],
    [3, 'integer', 3],
    [3.4, 'integer', 3],
    [null, 'integer', null],
    [undefined, 'integer', undefined],
    [[3], 'integer', undefined],
    [{ test: 3 }, 'integer', undefined],
    ['3', 'float', 3],
    ['3.4', 'float', 3.4],
    [3, 'float', 3],
    [3.4, 'float', 3.4],
    [null, 'float', null],
    [undefined, 'float', undefined],
    [[3], 'float', undefined],
    [{ test: 3 }, 'float', undefined],
    ['true', 'boolean', true],
    [true, 'boolean', true],
    ['f', 'boolean', false],
    [null, 'boolean', null],
    [undefined, 'boolean', undefined],
    [[3], 'boolean', null],
    [{ test: 3 }, 'boolean', null],
    ['test', 'string', 'test'],
    // TODO What about other data types? These are obviously not strings, see in the usage
    [[3, 4], 'string', [3, 4]],
    [{ test: 3 }, 'string', { test: 3 }]
]).test('parseValue: %s %s', (value, type, expected) => {
    expect(Helpers.parseValue(value, type)).toEqual(expected);
});

each([
    [undefined, '../', null],
    [null, undefined, null],
    ['foo.bar.test', '.', null],
    ['foo.bar.test', 'notRelative', null],
    ['foo.bar.test', '../../myField', 'foo.myField'],
    ['foo.bar.test', '../../../myField', 'myField'],
    ['foo.bar.test', '../', 'foo.bar'],
    ['foo.bar.test', '../../../myField', 'myField'],
    ['foo.bar.test', '../../../../myField', 'myField'],
    ['foo.bar.test', '../../myField.abc', 'foo.myField.abc'],
    ['foo.bar.test', '../../../', null],
]).test('getPath: %s %s', (path, relativePath, expected) => {
    expect(Helpers.getPath(path, relativePath)).toEqual(expected);
});

test('getPath without relative path', () => {
    expect(Helpers.getPath(null)).toEqual(null);
    expect(Helpers.getPath(undefined)).toEqual(null);
    expect(Helpers.getPath('test')).toEqual('test');
});

each([
    ['section1.q1', 'def', undefined, (interviewAttributes.responses.section1 as any).q1],
    ['section1.q3', 'def', undefined, 'def'],
    ['section1.q3', undefined, undefined, undefined],
    ['section1.q1', 'def', '../../section2.q1', (interviewAttributes.responses.section2 as any).q1],
    ['section1.q1', 'def', 'section2.q1', null],
    ['section1', 'def', undefined, (interviewAttributes.responses.section1 as any)],
]).test('getResponse: %s %s %s', (path, defaultValue, relativePath, expected) => {
    expect(Helpers.getResponse(interviewAttributes, path, defaultValue, relativePath)).toEqual(expected);
});

each([
    ['section1.q1', 'def', undefined, 'section1.q1'],
    ['section1.q3', undefined, undefined, 'section1.q3'],
    ['section1.q1', [1, 2, 3], '../../section2.q1', 'section2.q1'],
    ['section1.q1.sq1', 'def', undefined, 'section1.q1.sq1'],
    ['section1.q1', 'def', 'section2.q1', 'section1.q1', 'abc']
]).test('setResponse: %s %s %s', (path, value, relativePath, finalPath, expected = undefined) => {
    const attributes = _cloneDeep(interviewAttributes);
    Helpers.setResponse(attributes, path, value, relativePath);
    expect(Helpers.getResponse(attributes, finalPath)).toEqual(expected === undefined ? value : expected);
});

each([
    ['section1.q1', undefined, true],
    ['section1.q1', false, true],
    ['section1.q3', undefined, null],
    ['section1.q3', true, true],
    ['section1.q3', false, false],
    ['section1', undefined, null],
    ['section1', true, null],
    ['section1', false, null],
    ['section1.q2', undefined, false],
]).test('getValidation: %s %s %s', (path, defaultValue, expected) => {
    expect(Helpers.getValidation(interviewAttributes, path, defaultValue)).toEqual(expected);
});

each([
    ['section1.q1', true, undefined, 'section1.q1'],
    ['section1.q3', false, undefined, 'section1.q3'],
    ['section1.q1', true, '../../section2.q1', 'section2.q1'],
    ['section1.q1.sq1.other', false, undefined, 'section1.q1.sq1.other'],
    ['section1.q1', false, 'section2.q1', 'section1.q1', true]
]).test('setValidation: %s %s %s', (path, value, relativePath, finalPath, expected = undefined) => {
    const attributes = _cloneDeep(interviewAttributes);
    Helpers.setValidation(attributes, path, value, relativePath);
    expect(Helpers.getValidation(attributes, finalPath)).toEqual(expected === undefined ? value : expected);
});

each([
    [[], undefined],
    [[{ test: 'foo' }], undefined],
    [[{ test: 'foo' }, 'abc', true], 'abc'],
    [['1234 test street', 'H2R2B8'], '1234 test street, H2R2B8'],
    [['1234 test street', 'H2R2B8', 543], '1234 test street, H2R2B8, 543'],
    [['1234 test street', null], '1234 test street'],
]).test('formatGeocodingQueryStringFromMultipleFields: %s', (fields, expected) => {
    expect(Helpers.formatGeocodingQueryStringFromMultipleFields(fields)).toEqual(expected);
});