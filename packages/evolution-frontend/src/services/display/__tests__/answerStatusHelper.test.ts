/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TFunction } from 'i18next';

import { getAnswerDisplayString } from '../answerStatusHelper';
import { AnswerStatus } from 'evolution-common/lib/services/baseObjects/attributeTypes/AnswerStatus';

describe('getAnswerDisplayString', () => {
    // The reason an answer has no value is displayed translated
    const t = ((key: string) => `translated:${key}`) as unknown as TFunction;

    test.each([
        { description: 'an answered number', answer: { status: 'answered', value: 2 }, expected: '2' },
        { description: 'a number stored as the value', answer: 2, expected: '2' },
        {
            description: 'an answered false, which is a value',
            answer: { status: 'answered', value: false },
            expected: 'false'
        },
        { description: 'a boolean stored as the value', answer: false, expected: 'false' },
        {
            description: 'an answer the respondent does not know',
            answer: { status: 'dont_know' },
            expected: 'translated:interviewStats.answerStatus.dont_know'
        },
        {
            description: 'a refused answer',
            answer: { status: 'refusal' },
            expected: 'translated:interviewStats.answerStatus.refusal'
        },
        { description: 'an attribute holding nothing', answer: undefined, expected: '?' }
    ])('$description', ({ answer, expected }) => {
        expect(getAnswerDisplayString(answer as AnswerStatus<unknown>, t)).toEqual(expected);
    });
});
