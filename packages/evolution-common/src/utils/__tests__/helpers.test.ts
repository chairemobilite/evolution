/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import each from 'jest-each';
import i18n from 'i18next';
import moment from 'moment';
import { v4 as uuidV4 } from 'uuid';
import _cloneDeep from 'lodash/cloneDeep';
import config from 'chaire-lib-common/lib/config/shared/project.config';

import * as Helpers from '../helpers';
import { UserInterviewAttributes } from '../../services/questionnaire/types';

jest.mock('i18next', () => ({
    t: jest.fn(),
    language: 'en'
}));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('arbitrary uuid') }));
const mockedT = i18n.t as jest.MockedFunction<typeof i18n.t>;

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_questionable: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true
};

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
};


const interviewAttributesWithHh: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_questionable: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        },
        household: {
            size: 1,
            persons: {
                personId1: {
                    _uuid: 'personId1',
                    journeys: {
                        journeyId1: {
                            _uuid: 'journeyId1',
                            _sequence: 1
                        }
                    }
                },
                personId2: {
                    _uuid: 'personId2'
                }
            }
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true
};

const arbitraryFunction = jest.fn();
beforeEach(() => {
    mockedT.mockClear();
    arbitraryFunction.mockClear();
})

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
    ['', 'integer', null],
    ['3', 'float', 3],
    ['3.4', 'float', 3.4],
    [3, 'float', 3],
    [3.4, 'float', 3.4],
    [null, 'float', null],
    [undefined, 'float', undefined],
    [[3], 'float', undefined],
    [{ test: 3 }, 'float', undefined],
    ['', 'float', null],
    ['true', 'boolean', true],
    [true, 'boolean', true],
    ['f', 'boolean', false],
    [null, 'boolean', null],
    [undefined, 'boolean', undefined],
    [[3], 'boolean', null],
    [{ test: 3 }, 'boolean', null],
    ['test', 'string', 'test'],
    ['', 'string', null],
    ['test', 'string', 'test'],
    [3, 'string', '3'],
    [null, 'string', null],
    [undefined, 'string', undefined],
    [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0,0]}, properties: {} }, 'geojson', { type: 'Feature', geometry: { type: 'Point', coordinates: [0,0]}, properties: {} }],
    // Should add the properties to the feature
    [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0,0]} }, 'geojson', { type: 'Feature', geometry: { type: 'Point', coordinates: [0,0]}, properties: {} }],
    [{ type: 'Feature', geometry: 'not a geometry' }, 'geojson', null],
    [3, 'geojson', null],
    ['not a feature', 'geojson', null],
    [[3, 4], undefined, [3, 4]],
    [{ test: 3 }, undefined, { test: 3 }],
    // TODO What about other data types? They are simply converted to string, should something else be done?
    [[3, 4], 'string', String([3, 4])],
    [{ test: 3 }, 'string', String({ test: 3 })]
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
    ['section1.q1', 'def', undefined, ((interviewAttributesWithHh.responses as any).section1 as any).q1],
    ['section1.q3', 'def', undefined, 'def'],
    ['section1.q3', undefined, undefined, undefined],
    ['section1.q1', 'def', '../../section2.q1', ((interviewAttributesWithHh.responses as any).section2 as any).q1],
    ['section1.q1', 'def', 'section2.q1', null],
    ['section1', 'def', undefined, ((interviewAttributesWithHh.responses as any).section1 as any)],
]).test('getResponse: %s %s %s', (path, defaultValue, relativePath, expected) => {
    expect(Helpers.getResponse(interviewAttributesWithHh, path, defaultValue, relativePath)).toEqual(expected);
});

each([
    ['section1.q1', 'def', undefined, 'section1.q1'],
    ['section1.q3', undefined, undefined, 'section1.q3'],
    ['section1.q1', [1, 2, 3], '../../section2.q1', 'section2.q1'],
    ['section1.q1.sq1', 'def', undefined, 'section1.q1.sq1'],
    ['section1.q1', 'def', 'section2.q1', 'section1.q1', 'abc']
]).test('setResponse: %s %s %s', (path, value, relativePath, finalPath, expected = undefined) => {
    const attributes = _cloneDeep(interviewAttributesWithHh);
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
    expect(Helpers.getValidation(interviewAttributesWithHh, path, defaultValue)).toEqual(expected);
});

each([
    ['section1.q1', true, undefined, 'section1.q1'],
    ['section1.q3', false, undefined, 'section1.q3'],
    ['section1.q1', true, '../../section2.q1', 'section2.q1'],
    ['section1.q1.sq1.other', false, undefined, 'section1.q1.sq1.other'],
    ['section1.q1', false, 'section2.q1', 'section1.q1', true]
]).test('setValidation: %s %s %s', (path, value, relativePath, finalPath, expected = undefined) => {
    const attributes = _cloneDeep(interviewAttributesWithHh);
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

test('parseString', () => {
    // Default string value
    expect(Helpers.parseString('test', interviewAttributes, 'some.path')).toEqual('test');
    // Undefined
    expect(Helpers.parseString(undefined, interviewAttributes, 'some.path')).toEqual(undefined);

    const parseFct = jest.fn().mockReturnValue('test');
    // With function, without user
    expect(Helpers.parseString(parseFct, interviewAttributes, 'some.path')).toEqual('test');
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseString(parseFct, interviewAttributes, 'some.path', userAttributes )).toEqual('test');
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', userAttributes);
});

test('parseBoolean', () => {
    // boolean value
    expect(Helpers.parseBoolean(false, interviewAttributes, 'some.path')).toEqual(false);
    // Undefined or null, with or without default value
    expect(Helpers.parseBoolean(undefined, interviewAttributes, 'some.path')).toEqual(true);
    expect(Helpers.parseBoolean(null, interviewAttributes, 'some.path')).toEqual(true);
    expect(Helpers.parseBoolean(undefined, interviewAttributes, 'some.path', undefined, false)).toEqual(false);

    const parseFct = jest.fn().mockReturnValue(true);
    // With function, without user
    expect(Helpers.parseBoolean(parseFct, interviewAttributes, 'some.path')).toEqual(true);
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseBoolean(parseFct, interviewAttributes, 'some.path', userAttributes)).toEqual(true);
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);
    // With array return value
    parseFct.mockReturnValueOnce([false, 'a']);
    expect(Helpers.parseBoolean(parseFct, interviewAttributes, 'some.path', userAttributes)).toEqual(false);
    expect(parseFct).toHaveBeenCalledTimes(3);
    expect(parseFct).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);
});

test('parse', () => {
    const returnValue = { foo: 'bar' };

    // Default values of different types
    expect(Helpers.parse('test', interviewAttributes, 'some.path')).toEqual('test');
    expect(Helpers.parse(4, interviewAttributes, 'some.path')).toEqual(4);
    expect(Helpers.parse(returnValue, interviewAttributes, 'some.path')).toEqual(returnValue);
    // Undefined
    expect(Helpers.parse(undefined, interviewAttributes, 'some.path')).toEqual(undefined);

    const parseFct = jest.fn().mockReturnValue(returnValue);
    // With function, without user
    expect(Helpers.parse(parseFct, interviewAttributes, 'some.path')).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parse(parseFct, interviewAttributes, 'some.path', userAttributes )).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', userAttributes);
});

test('parseInteger', () => {
    // integer value
    expect(Helpers.parseInteger(3, interviewAttributes, 'some.path')).toEqual(3);
    // Undefined
    expect(Helpers.parseInteger(undefined, interviewAttributes, 'some.path')).toEqual(undefined);

    // parse function returns number
    const returnValue = 4;
    const parseFct = jest.fn().mockReturnValue(returnValue);
    // With function, without user
    expect(Helpers.parseInteger(parseFct, interviewAttributes, 'some.path')).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseInteger(parseFct, interviewAttributes, 'some.path', userAttributes)).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);

    // parse function returns string
    const returnValueStr = '4';
    const parseFctStr = jest.fn().mockReturnValue(returnValueStr);
    // With function, without user
    expect(Helpers.parseInteger(parseFctStr, interviewAttributes, 'some.path')).toEqual(returnValue);
    expect(parseFctStr).toHaveBeenCalledTimes(1);
    expect(parseFctStr).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseInteger(parseFctStr, interviewAttributes, 'some.path', userAttributes)).toEqual(returnValue);
    expect(parseFctStr).toHaveBeenCalledTimes(2);
    expect(parseFctStr).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);
});

each([
    ['Simple string', 'test', 'test', undefined],
    ['Object with simple strings', { en: 'english', fr: 'french' }, 'english', undefined],
    ['Object with parsed function', { en: arbitraryFunction.mockReturnValue('english'), fr: jest.fn().mockReturnValue('french') }, 'english', 'parseString'],
    ['TFunction', arbitraryFunction.mockReturnValue('english'), 'english', 'parseWithT'],
]).test('translate string: %s', (_title, toTranslate, expected, testCall?: 'parseString' | 'parseWithT') => {
    const path = 'some.path';
    expect(Helpers.translateString(toTranslate, i18n, interviewAttributes, path, userAttributes)).toEqual(expected);
    if (testCall === 'parseString') {
        expect(arbitraryFunction).toHaveBeenCalledWith(interviewAttributes, path, userAttributes);
    } else if (testCall === 'parseWithT') {
        expect(arbitraryFunction).toHaveBeenCalledWith(i18n.t, interviewAttributes, path, userAttributes);
    }
});

each([
    ['simple path', 'home.address', 'home.address'],
    ['single replacement for the whole string', '{section1.q1}', 'abc'],
    ['single replacement at the beginning', '{section1.q1}.something', 'abc.something'],
    ['single replacement at the end', 'something.{section1.q1}', 'something.abc'],
    ['single replacement in the middle', 'something.{section1.q2}.other', 'something.3.other'],
    ['replacement by an object response', 'something.{section1}.other', 'something.unknown.other'],
    ['many replacements with no dot after second', 'something.{section1.q1}.{section2.q1}other', 'something.abc.testother'],
    ['undefined replaced value', 'something.{section3.q1}.other', 'something.unknown.other'],
    ['bot defined and undefined replaced values', 'something.{section1.q1}.{section3.q1}.other', 'something.abc.unknown.other'],
]).test('interpolatePath, %s', (_title, path, expectedPath) => {
    expect(Helpers.interpolatePath(interviewAttributes, path)).toEqual(expectedPath);
});

each([
    ['Phone Number, 10-digit', '5141234567', true],
    ['Phone Number, spaces', '514 123 4567', true],
    ['Phone Number, more spaces', '514   123   4567', true],
    ['Phone Number, dashes', '514-123-4567', true],
    ['Phone Number, more dashes', '514---123---4567', true],
    ['Phone Number, dots', '514.123.4567', true],
    ['Phone Number, parenthesis & spaces', '(514) 123 4567', true],
    ['Phone Number, parenthesis & dash, dots', '(514)-123.4567', true],
    ['Phone Number, with prefix 11-digit', '15141234567', true],
    ['Phone Number, with prefix 12-digit', '125141234567', true],
    ['Phone Number, with prefix 13-digit', '1235141234567', true],
    ['Phone Number, plus prefix', '+1 5141234567', true],
    ['Phone Number, plus prefix & spaces', '+123 514 123 4567', true],
    ['Phone Number, plus prefix & dashes', '+123-514-123-4567', true],
    ['Phone Number, plus prefix & parenthesis & space, dash', '+123 (514) 123-4567', true],
    ['Phone Number, plus prefix & more dashes', '+123---514---123---4567', true],
    ['Phone Number, extension', '5141234567x1234', true],
    ['Phone Number, extension & spaces', '514 123 4567 x1234', true],
    ['Phone Number, extension & prefix', '1235141234567x1234', true],
    ['Phone Number, everything', '+123 (514)-123.4567 x1234', true],
    ['Not a Phone Number, letter', '514ABC4567', false],
    ['Not a Phone Number, too many numbers', '514 123456 789012345', false],
    ['Not a Phone Number, bad parenthesis', '(514)-(123)-(4567)', false],
    ['Not a Phone Number, invalid characters', '514/123/4567', false]
]).test('Is Phone Number? %s', (_title, phoneNumber, expected) => {
    expect(Helpers.isPhoneNumber(phoneNumber)).toEqual(expected);
});

each([
    [undefined, undefined, true],
    [undefined, moment('2023-12-13').unix(), true],
    [undefined, 'notadate', true],
    ['notadate', undefined, true],
    ['notadate', moment('2023-12-13').unix(), true],
    ['2023-12-13', moment('2023-12-13').unix(), true],
    ['2023-12-13', moment('2023-12-12').unix(), false],
    ['2023-12-13', moment('2023-12-14').unix(), true]
]).test('survey start: %s %s', (configValue, surveyStart, expected) => {
    config.surveyStart = configValue;
    const interview = _cloneDeep(interviewAttributes);
    interview.responses._startedAt = surveyStart;
    expect(Helpers.surveyStarted(interview)).toEqual(expected);
});

each([
    [undefined, undefined, true],
    [undefined, moment('2023-12-13').unix(), true],
    [undefined, 'notadate', true],
    ['notadate', undefined, true],
    ['notadate', moment('2023-12-13').unix(), true],
    ['2023-12-13', moment('2023-12-13').unix(), true],
    ['2023-12-13', moment('2023-12-12').unix(), false],
    ['2023-12-13', moment('2023-12-14').unix(), true]
]).test('survey ended: %s %s', (configValue, surveyStart, expected) => {
    config.surveyEnd = configValue;
    const interview = _cloneDeep(interviewAttributes);
    interview.responses._startedAt = surveyStart;
    expect(Helpers.surveyEnded(interview)).toEqual(expected);
});

each([
    [undefined, undefined, null],
    [undefined, moment('2023-12-13').unix(), null],
    [undefined, 'notadate', null],
    ['notadate', undefined, null],
    ['notadate', moment('2023-12-13').unix(), null],
    ['2023-12-13', moment('2023-12-13').unix(), true],
    ['2023-12-13', moment('2023-12-12').unix(), false],
    ['2023-12-13', moment('2023-12-14').unix(), true]
]).test('survey start: %s %s', (dateCompare, surveyStart, expected) => {
    const interview = _cloneDeep(interviewAttributes);
    interview.responses._startedAt = surveyStart;
    expect(Helpers.interviewOnOrAfter(dateCompare, interview)).toEqual(expected);
});

describe('Group functions', () => {
    each([
        ['one object at the end', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 1, -1, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 3 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { } 
        }],
        ['0 objects', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 0, -1, [], { }],
        ['one object at sequence', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 1, 2, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2._sequence': 3,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 2 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { }
        }],
        ['one object at sequence 0, should be 1', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 1, 0, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj1._sequence': 2,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2._sequence': 3,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 1 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { }
        }],
        ['one object at sequence too large', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 1, 5, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 3 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { }
        }],
        ['2 objects, no previous objects', {}, 2, undefined, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 1 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { _uuid: 'newObj1', _sequence: 2 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { } 
        }],
        ['3 objects, at sequence 2', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 3, 2, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2._sequence': 5,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 2 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { _uuid: 'newObj1', _sequence: 3 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj2': { _uuid: 'newObj2', _sequence: 4 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj2': { }
        }],
        ['with attributes, same count',  {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 3, 2, [{ myVal: 'first' }, { myVal: 'second', other: 'test' }, { myVal: 'third' }], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2._sequence': 5,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 2, myVal: 'first' },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { _uuid: 'newObj1', _sequence: 3, myVal: 'second', other: 'test' },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj2': { _uuid: 'newObj2', _sequence: 4, myVal: 'third' },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj2': { }
        }],
        ['with attributes, unequal count',  {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 3, 2, [{ myVal: 'first' }, { myVal: 'second', other: 'test' }], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2._sequence': 5,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 2, myVal: 'first' },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { _uuid: 'newObj1', _sequence: 3, myVal: 'second', other: 'test' },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj1': { },
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj2': { _uuid: 'newObj2', _sequence: 4 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj2': { }
        }],
        ['negative object count', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, -1, -1, [], { }],
        ['negative, but not -1, sequence', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 1, -2, [], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { _uuid: 'newObj0', _sequence: 3 },
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.newObj0': { } 
        }]
    ]).test('add grouped objects: %s', (_title, previousObj, count, seq, attributes, expected) => {
        // Mock the uuid return value
        for (let i = 0; i < count; i++) {
            (uuidV4 as jest.Mock).mockReturnValueOnce(`newObj${i}`);
        }
        const basePath = 'household.persons.personId1.journeys.journeyId1.visitedPlaces';
        const interview = _cloneDeep(interviewAttributesWithHh);
        interview.responses.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces = previousObj;
        expect(Helpers.addGroupedObjects(interview, count, seq, basePath, attributes)).toEqual(expected);
    });

    each([
        ['single object to remove at the end', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 'obj2', {}, [
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2'
        ]],
        ['multiple objects to remove at the end', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2},
            obj3: { _uuid: 'obj3', _sequence: 3}
        }, ['obj2', 'obj3'], {}, [
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj3',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj3'
        ]],
        ['single object to remove in the middle', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2},
            obj3: { _uuid: 'obj3', _sequence: 3}
        }, 'obj2', {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj3._sequence': 2
        }, [
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2'
        ]],
        ['multiple objects to remove at various location', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2},
            obj3: { _uuid: 'obj3', _sequence: 3},
            obj4: { _uuid: 'obj4', _sequence: 4},
            obj5: { _uuid: 'obj5', _sequence: 5}
        }, ['obj2', 'obj4'], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj3._sequence': 2,
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj5._sequence': 3
        }, [
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj4',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj4'
        ]],
        ['unexisting objects', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, 'objnone', {}, []],
        ['no path to remove', {
            obj1: { _uuid: 'obj1', _sequence: 1},
            obj2: { _uuid: 'obj2', _sequence: 2}
        }, [], {}, []],
        ['No sequence in previous object data', {
            obj1: { _uuid: 'obj1'},
            obj2: { _uuid: 'obj2'},
            obj3: { _uuid: 'obj3'}
        }, ['obj2'], {
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj3._sequence': 2
        }, [
            'responses.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2',
            'validations.household.persons.personId1.journeys.journeyId1.visitedPlaces.obj2'
        ]]
    ]).test('remove grouped objects: %s', (_title, previousObj, paths, expectedByPath, expectedUnset) => {
        const basePath = 'household.persons.personId1.journeys.journeyId1.visitedPlaces';
        const interview = _cloneDeep(interviewAttributesWithHh);
        const completePaths = typeof paths === 'string' ? `${basePath}.${paths}` : paths.map(path => `${basePath}.${path}`);
        interview.responses.household!.persons!.personId1.journeys!.journeyId1.visitedPlaces = previousObj;
        expect(Helpers.removeGroupedObjects(interview, completePaths)).toEqual([expectedByPath, expectedUnset]);
    });
});