/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export const yesNoDontKnowNonApplicableValues = ['yes', 'no', 'dontKnow', 'nonApplicable'];
export type YesNoDontKnowNonApplicable = (typeof yesNoDontKnowNonApplicableValues)[number];

export const yesNoDontKnowPreferNotToAnswerValues = ['yes', 'no', 'dontKnow', 'preferNotToAnswer'];
export type YesNoDontKnowPreferNotToAnswer = (typeof yesNoDontKnowPreferNotToAnswerValues)[number];
