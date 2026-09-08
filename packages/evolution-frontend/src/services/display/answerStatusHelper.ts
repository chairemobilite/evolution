/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TFunction } from 'i18next';

import {
    answerToString,
    isAnswerStatus,
    toAnswerStatus,
    type AnswerStatus
} from 'evolution-common/lib/services/baseObjects/attributeTypes/AnswerStatus';
import { Optional } from 'evolution-common/lib/types/Optional.type';

/**
 * Display an answer for a reviewer: the value when one was given, otherwise the
 * translated reason there is none. A plain number or boolean is the answered
 * value itself.
 *
 * @param answer The answer to display, wrapped or as the value
 * @param t The translation function
 * @return The value that was answered, the translated reason there is none, or
 * `?` when no answer was recorded
 */
export const getAnswerDisplayString = <T>(answer: Optional<AnswerStatus<T> | T>, t: TFunction): string => {
    const wrapped = isAnswerStatus<T>(answer) ? answer : toAnswerStatus<T>(answer);
    return wrapped === undefined || wrapped.status === 'answered'
        ? answerToString(wrapped)
        : t(`interviewStats.answerStatus.${wrapped.status}`);
};
