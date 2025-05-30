/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// This file contains helper function to get the current navigation state of an
// interview and the status of the various sections for a given interview. To be
// updated when we update how navigation is stored.

import { getResponse } from '../../../utils/helpers';
import { InterviewResponse, UserRuntimeInterviewAttributes } from '../types';
import { NavigationSection } from '../types/NavigationTypes';

/**
 * Get the last visited section from the interview object
 *
 * @param {Object} options - The options object
 * @param {UserRuntimeInterviewAttributes} options.interview The interview object
 * @returns The last visited section
 */
export const getLastVisitedSection = ({
    interview
}: {
    interview: UserRuntimeInterviewAttributes;
}): NavigationSection | undefined => {
    const sectionActions = getResponse(interview, '_sections._actions', []) as Array<
        InterviewResponse['_sections.actions']
    >;
    return sectionActions.length > 0
        ? {
            sectionShortname: sectionActions[sectionActions.length - 1].section,
            iterationContext: sectionActions[sectionActions.length - 1].iterationContext
        }
        : undefined;
};

/**
 * Get whether a section is marked as completed or not
 *
 * @param {Object} options - The options object
 * @param {UserRuntimeInterviewAttributes} options.interview The interview
 * object
 * @param {string} options.section The name of the section to check
 * @param {string[]} [options.iterationContext] The specific iteration context
 * to check if the section is part of a repeated block
 * @returns Whether the section is marked as completed
 */
export const isSectionCompleted = ({
    interview,
    sectionName,
    iterationContext
}: {
    interview: UserRuntimeInterviewAttributes;
    sectionName: string;
    iterationContext?: string[];
}): boolean => {
    const sectionPath = iterationContext ? `${sectionName}.${iterationContext.join('/')}` : sectionName;
    const sectionStatus = getResponse(interview, `_sections.${sectionPath}`, {}) as { _isCompleted?: boolean };
    return sectionStatus._isCompleted === true;
};

/**
 * Check if the iteration context has started for a given interview. It will
 * return true if any section for that iteration context has started.
 *
 * @param {Object} options - The options object
 * @param {UserRuntimeInterviewAttributes} options.interview The interview object
 * @param {string[]} options.iterationContext The iteration context to check
 * @returns Whether the iteration context has started
 */
export const isIterationContextStarted = ({
    interview,
    iterationContext
}: {
    interview: UserRuntimeInterviewAttributes;
    iterationContext: string[];
}): boolean => {
    if (iterationContext.length === 0) {
        return true;
    }
    const iterationString = iterationContext.join('/');
    const sectionsStatus = getResponse(interview, '_sections', {}) as {
        [sectionName: string]: { _startedAt?: number };
    };
    return Object.keys(sectionsStatus).some((sectionName) => {
        const sectionStatus = sectionsStatus[sectionName];
        return sectionStatus[iterationString] !== undefined && sectionStatus[iterationString]._startedAt !== undefined;
    });
};
