/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export const yesNoDontKnowValues = ['yes', 'no', 'dontKnow'];
export type YesNoDontKnow = (typeof yesNoDontKnowValues)[number];

export const yesNoRefusalValues = ['yes', 'no', 'refusal'];
export type YesNoRefusal = (typeof yesNoRefusalValues)[number];

export const yesNoDontKnowNonApplicableValues = ['yes', 'no', 'dontKnow', 'nonApplicable'];
export type YesNoDontKnowNonApplicable = (typeof yesNoDontKnowNonApplicableValues)[number];

export const yesNoPreferNotToAnswerValues = ['yes', 'no', 'preferNotToAnswer'];
export type YesNoPreferNotToAnswer = (typeof yesNoPreferNotToAnswerValues)[number];

export const yesNoDontKnowPreferNotToAnswerValues = ['yes', 'no', 'dontKnow', 'preferNotToAnswer'];
export type YesNoDontKnowPreferNotToAnswer = (typeof yesNoDontKnowPreferNotToAnswerValues)[number];

export type TimePeriod = string; // TODO: normalize time periods (when time is too precise, like for long distance journeys)

export type StartEndTimestampable = {
    startTimestamp?: number; // unix epoch timestamp in seconds (not milliseconds)
    endTimestamp?: number; // unix epoch timestamp in seconds (not milliseconds); could be calculated from the next start timestamp
};
