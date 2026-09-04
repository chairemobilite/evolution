/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Optional } from 'evolution-common/lib/types/Optional.type';

type InterviewVisitedPlaceAttributes = ExtendedVisitedPlaceAttributes & {
    arrivalTime?: Optional<number>;
    departureTime?: Optional<number>;
};

/**
 * Map interview visited-place times to survey-object names.
 * Questionnaire stores `arrivalTime` / `departureTime`; VisitedPlace uses
 * `startTime` / `endTime`. Existing object names win when both are present.
 * Interview names are deleted so they do not become custom attributes.
 *
 * @param attributes Visited-place attributes from the interview or a parser
 * @returns A shallow copy with `startTime` / `endTime` and without interview time names
 */
export const mapInterviewVisitedPlaceTimes = (
    attributes: InterviewVisitedPlaceAttributes
): ExtendedVisitedPlaceAttributes => {
    const mapped: InterviewVisitedPlaceAttributes = { ...attributes };
    if (mapped.startTime === undefined && mapped.arrivalTime !== undefined) {
        mapped.startTime = mapped.arrivalTime;
    }
    if (mapped.endTime === undefined && mapped.departureTime !== undefined) {
        mapped.endTime = mapped.departureTime;
    }
    delete mapped.arrivalTime;
    delete mapped.departureTime;
    return mapped;
};
