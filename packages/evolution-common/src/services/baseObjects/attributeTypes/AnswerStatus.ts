/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Optional } from '../../../types/Optional.type';

export const answerStatusValues = ['answered', 'dont_know', 'refusal', 'not_applicable'] as const;
export type AnswerStatusValue = (typeof answerStatusValues)[number];

/**
 * An answer that is either a value or the reason there is none.
 *
 * Attributes typed with a list of values keep those reasons among their
 * members, the way `carType` holds `dontKnow` and `nonApplicable`. This wrapper
 * is for the attributes whose value is a string, number or a boolean, which cannot hold
 * a reason without giving up their type: without it, a survey that lets a
 * respondent answer "I don't know" has nowhere to store it, and the value it
 * writes instead fails validation.
 *
 * `answered` always carries a value, so reading an answer never requires
 * guessing what an empty value meant. The other statuses each say why there is
 * none: the answer given was not a value (`dont_know`, `refusal`), or the
 * question was considered 'not applicable'
 * (ex: driving license ownership for a person < min age for license).
 *
 * An attribute that is `undefined`, rather than one of these statuses, means no
 * answer was recorded, whether the question was never part of this respondent's
 * path or was left blank. Telling those two apart takes knowing which questions
 * were actually put to the respondent, which the answers alone do not say, so
 * they share the same empty attribute.
 */
// TODO Add the statuses that tell apart the ways an answer can be missing:
// `unanswered` for a question that was put to the respondent and got nothing,
// and possibly the distinction between a question ruled out by a conditional,
// one the survey never displays and one the respondent did not reach. Each of
// those needs the questionnaire flow to be followed and stored somewhere, so
// they take a design discussion of their own.
export type AnswerStatus<T> =
    | { status: 'answered'; value: T }
    | { status: 'dont_know' }
    | { status: 'refusal' }
    | { status: 'not_applicable' };

/**
 * Non-response values a questionnaire may store in place of an answer, and the
 * status each one stands for. These are the members the lists of values use for
 * the same purpose, so that a choice shared by both kinds of attribute keeps
 * its meaning.
 *
 * This is not the exhaustive list of what a questionnaire may write: it holds
 * the values the surveys known here use, and a survey naming its own
 * non-responses differently maps them in its own parser.
 */
// TODO Normalize `refusal` and `preferNotToAnswer`, which name the same
// non-response and both appear in the lists of values of `GenericAttributes`,
// so that a questionnaire has one way to say it and the exports one value to
// map. Both are accepted here until then.
const statusByNonResponseValue: { [value: string]: AnswerStatusValue } = {
    dontKnow: 'dont_know',
    unknown: 'dont_know',
    preferNotToAnswer: 'refusal',
    refusal: 'refusal',
    nonApplicable: 'not_applicable'
};

/**
 * @param {unknown} value The value to check
 * @returns {boolean} Whether the value is an answer wrapped in a known status
 */
export const isAnswerStatus = <T>(value: unknown): value is AnswerStatus<T> =>
    typeof value === 'object' && value !== null && answerStatusValues.includes((value as AnswerStatus<unknown>).status);

/**
 * Wrap an answer read from a questionnaire response in its status.
 *
 * Questionnaires store these answers as plain values, so this accepts them as
 * they come: a non-response value known to the surveys above becomes its
 * status, anything else becomes the answered value. The value itself is not
 * converted, as only the survey knows what its own choices mean: a survey whose
 * choices are strings, like `yes` for a boolean attribute, has to map them in
 * its own parser rather than have this guess.
 *
 * A blank response, which the questionnaires write as `undefined`, `null` or an
 * empty string, gives no status at all: it says only that nothing was recorded,
 * not whether the question was ever asked.
 *
 * The value is typed `unknown` rather than `T | string | AnswerStatus<T>`,
 * because it is read from a response that no type guards: a value of the wrong
 * type has to reach the attribute for `validateAnswerStatus` to report it,
 * instead of being dropped here.
 *
 * @param {unknown} value The answer as stored in the response
 * @returns {Optional<AnswerStatus<T>>} The wrapped answer, or `undefined` when
 * the response is blank
 */
export const toAnswerStatus = <T>(value: unknown): Optional<AnswerStatus<T>> => {
    if (_isBlank(value)) {
        return undefined;
    }
    if (isAnswerStatus<T>(value)) {
        return value;
    }
    const nonResponseStatus = typeof value === 'string' ? statusByNonResponseValue[value] : undefined;
    return nonResponseStatus
        ? ({ status: nonResponseStatus } as AnswerStatus<T>)
        : { status: 'answered', value: value as T };
};

/**
 * Wrap an answer to a question asking for a number.
 *
 * The widgets asking for a number store it as a string, next to the choices
 * that are not a number, like `dontKnow`, so a string holding a number becomes
 * the answered number and a known non-response becomes its status. Decimals go
 * through as they are written, since an attribute may well be answered with
 * one, like a number of rooms of 1.5; whether the attribute takes only whole
 * numbers is for its own validator to say.
 *
 * A string has to hold nothing but that number: one followed by anything else
 * is not wrapped, so that `validateAnswerStatus` reports it instead of it
 * going through silently truncated or stored as an answered string.
 *
 * @param {unknown} value The answer as stored in the response
 * @returns {Optional<AnswerStatus<number>>} The wrapped answer, or `undefined`
 * when the value is blank or is a string that is not a number
 */
export const toNumberAnswerStatus = (value: unknown): Optional<AnswerStatus<number>> => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return toAnswerStatus<number>(Number(trimmed));
        }
        if (!_isBlank(trimmed) && statusByNonResponseValue[value] === undefined) {
            return undefined;
        }
    }
    return toAnswerStatus<number>(value);
};

/**
 * @param {Optional<AnswerStatus<T>>} answer The answer to read
 * @returns {Optional<T>} The value that was answered, or `undefined` when there
 * is none, whatever the reason
 */
export const getAnswerValue = <T>(answer: Optional<AnswerStatus<T>>): Optional<T> =>
    answer !== undefined && answer.status === 'answered' ? answer.value : undefined;

/**
 * Write an answer as a single string, for the displays that show an attribute
 * as it was answered, like the admin review panels. Showing the status of an
 * answer without a value tells a reviewer that the question got an answer,
 * which reading the value alone would not.
 *
 * @param {Optional<AnswerStatus<T>>} answer The answer to display
 * @param {string} [noAnswerLabel] What to display when no answer was recorded
 * @returns {string} The value that was answered, or the status when there is
 * no value
 */
export const answerToString = <T>(answer: Optional<AnswerStatus<T>>, noAnswerLabel = '?'): string =>
    answer === undefined ? noAnswerLabel : answer.status === 'answered' ? String(answer.value) : answer.status;

/**
 * Validate an answer wrapped in its status, for the `validateParams` of the
 * objects holding one.
 *
 * @param {string} attribute The name of the attribute, for error display
 * @param {unknown} value The value to validate
 * @param {string} displayName The name of the object, for error display
 * @param {Function} validateValue Validator for the answered value itself,
 * like `ParamsValidatorUtils.isBoolean`
 * @returns {Error[]} The errors found, empty when the answer is valid
 */
export const validateAnswerStatus = (
    attribute: string,
    value: unknown,
    displayName: string,
    validateValue: (attribute: string, value: unknown, displayName: string) => Error[]
): Error[] => {
    if (value === undefined || value === null) {
        return [];
    }
    if (!isAnswerStatus<unknown>(value)) {
        return [new Error(`${displayName} validateParams: ${attribute} should be an answer with a status`)];
    }
    if (value.status !== 'answered') {
        // A status other than answered stands for the absence of a value, so a
        // value stored beside it contradicts it, and reading the answer would
        // leave that value unseen
        return _isBlank((value as { value?: unknown }).value)
            ? []
            : [new Error(`${displayName} validateParams: ${attribute} should have no value when it is not answered`)];
    }
    // An answered status without a value says both that there is an answer and
    // that there is none
    if (_isBlank(value.value)) {
        return [new Error(`${displayName} validateParams: ${attribute} should have a value when it is answered`)];
    }
    return validateValue(`${attribute}.value`, value.value, displayName);
};
