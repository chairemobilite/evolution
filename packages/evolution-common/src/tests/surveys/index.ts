/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { WidgetFactoryOptions } from '../../services/questionnaire/sections/types';
import { setResponse } from '../../utils/helpers';
import { interviewAttributesForTestCases } from './testCasesInterview';

export { interviewAttributesForTestCases } from './testCasesInterview';

/**
 * Set active survey objects in an interview. This is useful for testing
 * various cases related to active elements. The active objects can be unset by
 * passing undefined for the corresponding parameters.
 *
 * @param interview The interview object
 * @param options The object IDs to set as active
 * @param [options.personId] The ID of the person to set as active
 * @param [options.journeyId] The ID of the journey to set as active
 * @param [options.visitedPlaceId] The ID of the visited place to set as active
 * @param [options.activeTripId] The ID of the active trip to set as active
 * @param [options.activeSegmentId] The ID of the active segment to set as active
 */
export const setActiveSurveyObjects = (
    interview: typeof interviewAttributesForTestCases,
    {
        personId,
        journeyId,
        visitedPlaceId,
        activeTripId,
        activeSegmentId
    }: {
        personId?: string;
        journeyId?: string;
        visitedPlaceId?: string;
        activeTripId?: string;
        activeSegmentId?: string;
    }
) => {
    setResponse(interview, '_activePersonId', personId);
    setResponse(interview, '_activeJourneyId', journeyId);
    setResponse(interview, '_activeVisitedPlaceId', visitedPlaceId);
    setResponse(interview, '_activeTripId', activeTripId);
    setResponse(interview, '_activeSegmentId', activeSegmentId);
};

/**
 * Change all function properties in an object (or array) to
 * `expect.any(Function)` for easier testing with Jest
 * @param value The value for which to mask functions
 * @returns A value of the same type as the received one, but with function
 * properties masked
 */
export const maskFunctions = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(maskFunctions);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                k,
                typeof v === 'function' ? expect.any(Function) : maskFunctions(v)
            ])
        );
    }
    return value;
};

/** Provide the mandatory options for widget factory calls. */
export const widgetFactoryOptions: WidgetFactoryOptions = {
    getFormattedDate: jest.fn().mockImplementation((date: string) => date),
    buttonActions: { validateButtonAction: jest.fn(), validateButtonActionWithCompleteSection: jest.fn() },
    iconMapper: { 'check-circle': 'check-circle' as any }
};
