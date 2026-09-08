/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ParamsValidatorUtils } from '../../../../utils/ParamsValidatorUtils';
import {
    AnswerStatus,
    answerToString,
    getAnswerValue,
    isAnswerStatus,
    toAnswerStatus,
    toNumberAnswerStatus,
    validateAnswerStatus
} from '../AnswerStatus';

describe('isAnswerStatus', () => {
    test.each([
        ['an answered value', { status: 'answered', value: 2 }, true],
        ['a status without a value', { status: 'refusal' }, true],
        ['an unknown status', { status: 'maybe' }, false],
        ['an object without a status', { value: 2 }, false],
        ['a plain value', 2, false],
        ['null', null, false],
        ['undefined', undefined, false]
    ])('%s', (_description, value, expected) => {
        expect(isAnswerStatus(value)).toEqual(expected);
    });
});

describe('toAnswerStatus', () => {
    test.each([
        ['a number', 2, { status: 'answered', value: 2 }],
        ['zero, which is an answer', 0, { status: 'answered', value: 0 }],
        ['a true boolean', true, { status: 'answered', value: true }],
        ['a false boolean, which is an answer', false, { status: 'answered', value: false }],
        ['a string of the survey own choices', 'yes', { status: 'answered', value: 'yes' }],
        ['the dontKnow of the lists of values', 'dontKnow', { status: 'dont_know' }],
        ['the unknown of the lists of values', 'unknown', { status: 'dont_know' }],
        ['the preferNotToAnswer of the lists of values', 'preferNotToAnswer', { status: 'refusal' }],
        ['the refusal of the lists of values', 'refusal', { status: 'refusal' }],
        ['the nonApplicable of the lists of values', 'nonApplicable', { status: 'not_applicable' }],
        ['an answer already wrapped', { status: 'answered', value: 3 }, { status: 'answered', value: 3 }],
        ['a status already wrapped', { status: 'dont_know' }, { status: 'dont_know' }],
        ['no answer', undefined, undefined],
        ['a null answer', null, undefined],
        ['an empty answer', '', undefined]
    ])('%s', (_description, value, expected) => {
        expect(toAnswerStatus(value)).toEqual(expected);
    });
});

describe('toNumberAnswerStatus', () => {
    test.each([
        ['a number', 2, { status: 'answered', value: 2 }],
        ['a number stored as a string', '2', { status: 'answered', value: 2 }],
        ['a zero stored as a string', '0', { status: 'answered', value: 0 }],
        ['a non-response choice', 'dontKnow', { status: 'dont_know' }],
        ['a non-response choice named unknown', 'unknown', { status: 'dont_know' }],
        ['no answer', undefined, undefined],
        ['an empty answer', '', undefined],
        ['an answer holding only spaces', '   ', undefined],
        // A decimal is a number like any other here, the validator of the
        // attribute being the one to say whether it takes whole numbers only
        ['a decimal', '2.5', { status: 'answered', value: 2.5 }],
        // Not a number: left unwrapped so `validateAnswerStatus` can reject it
        ['a number followed by something else', '3abc', undefined]
    ])('%s', (_description, value, expected) => {
        expect(toNumberAnswerStatus(value)).toEqual(expected);
    });
});

describe('getAnswerValue', () => {
    test.each([
        ['an answered value', { status: 'answered', value: 2 }, 2],
        ['an answered false, which is a value', { status: 'answered', value: false }, false],
        ['a refused answer', { status: 'refusal' }, undefined],
        ['an attribute holding nothing', undefined, undefined]
    ])('%s', (_description, answer, expected) => {
        expect(getAnswerValue(answer as AnswerStatus<unknown>)).toEqual(expected);
    });
});

describe('answerToString', () => {
    test.each([
        { description: 'an answered number', answer: { status: 'answered', value: 2 }, expected: '2' },
        { description: 'an answered boolean', answer: { status: 'answered', value: false }, expected: 'false' },
        { description: 'a refused answer', answer: { status: 'refusal' }, expected: 'refusal' },
        { description: 'an attribute holding nothing', answer: undefined, expected: '?' },
        {
            description: 'an attribute holding nothing, with a label',
            answer: undefined,
            noAnswerLabel: 'no answer',
            expected: 'no answer'
        }
    ])('$description', ({ answer, noAnswerLabel, expected }) => {
        expect(answerToString(answer as AnswerStatus<unknown>, noAnswerLabel)).toEqual(expected);
    });
});

describe('validateAnswerStatus', () => {
    // The validator of the value is the one the attribute would use on its own
    test.each([
        {
            description: 'an answered boolean',
            value: { status: 'answered', value: true },
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: []
        },
        {
            description: 'an answered integer',
            value: { status: 'answered', value: 2 },
            validateValue: ParamsValidatorUtils.isPositiveInteger,
            expectedMessages: []
        },
        {
            description: 'a status without a value',
            value: { status: 'dont_know' },
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: []
        },
        {
            // No answer recorded leaves the attribute empty
            description: 'an attribute holding nothing',
            value: undefined,
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: []
        },
        {
            description: 'a value of the wrong type',
            value: { status: 'answered', value: 'yes' },
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: ['Segment validateParams: paidForParking.value should be a boolean']
        },
        {
            description: 'a plain value that was not wrapped',
            value: true,
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: ['Segment validateParams: paidForParking should be an answer with a status']
        },
        {
            description: 'an unknown status',
            value: { status: 'maybe' },
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: ['Segment validateParams: paidForParking should be an answer with a status']
        },
        {
            description: 'an answered status with no value',
            value: { status: 'answered' },
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: ['Segment validateParams: paidForParking should have a value when it is answered']
        },
        {
            description: 'a status without a value carrying one anyway',
            value: { status: 'refusal', value: true },
            validateValue: ParamsValidatorUtils.isBoolean,
            expectedMessages: ['Segment validateParams: paidForParking should have no value when it is not answered']
        }
    ])('$description', ({ value, validateValue, expectedMessages }) => {
        const errors = validateAnswerStatus('paidForParking', value, 'Segment', validateValue);
        expect(errors.map((error) => error.message)).toEqual(expectedMessages);
    });
});
