/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewAttributes, UserAction } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import moment from 'moment';

/** Change the prefixes in the valuesByPath, unsetPaths and userAction from
 * response to corrected_response. */
export const mapResponseToCorrectedResponse = (
    valuesByPath: { [key: string]: unknown },
    unsetPaths: string[],
    userAction?: UserAction
): { valuesByPath: { [key: string]: unknown }; unsetPaths: string[]; userAction?: UserAction } => {
    // Content in valuesByPath and unsetPaths with prefix 'response' should
    // be put in 'corrected_response' instead.
    const renameKey = (oldKey: string): string => {
        if (oldKey.startsWith('response.') || oldKey === 'response') {
            return oldKey.replace('response', 'corrected_response');
        }
        return oldKey;
    };

    // Map the values by path keys
    const updatedValuesByPath = {};
    Object.keys(valuesByPath).forEach((key) => {
        const newKey = renameKey(key);
        updatedValuesByPath[newKey] = valuesByPath[key];
    });
    // Map the unset paths
    const updatedUnsetPaths = unsetPaths.map(renameKey);
    // Map the user action if it is provided and is a widget interaction
    let updatedUserAction = userAction;
    if (userAction && userAction.type === 'widgetInteraction') {
        // If the user action is a widget interaction, we need to change the path
        // in the user action as well
        updatedUserAction = { ...userAction, path: renameKey(userAction.path) };
    }
    return { valuesByPath: updatedValuesByPath, unsetPaths: updatedUnsetPaths, userAction: updatedUserAction };
};

/**
 * Augment the valuesByPath with user action specific data, as some user actions
 * may require updating some additional fields in the interview response, like
 * the section navigation data or the language or browser.
 *
 * This function should be called before re-mapping the response to the
 * corrected response in the admin and before updating the interview when a user
 * action is provided
 *
 * FIXME The reason we need this function is to avoid having to refactor the
 * whole interview structure right now, but all that is here should eventually
 * be handled by their on data structures and not in the response.
 *
 * @param interview The interview attributes, containing the interview's current
 * data
 * @param valuesByPath The current values by path in the interview response
 * @param userAction The user action to handle
 * */
export const handleUserActionSideEffect = (
    interview: InterviewAttributes,
    valuesByPath: { [key: string]: unknown },
    userAction: UserAction
): { [key: string]: unknown } => {
    if (userAction.type === 'sectionChange') {
        // Set sections in the interview
        // TODO Should not be saved in the response, but somewhere else. See https://github.com/chairemobilite/evolution/issues/969 to implement the actual navigation
        valuesByPath[`response._sections.${userAction.targetSection.sectionShortname}._startedAt`] = moment().unix();
        // Complete the previous action
        if (userAction.previousSection) {
            valuesByPath[
                `response._sections.${userAction.previousSection.sectionShortname}${userAction.previousSection.iterationContext ? '.' + userAction.previousSection.iterationContext.join('/') : ''}._isCompleted`
            ] = true;
        }
        // FIXME With new navigation API, add iteration contexts
        // FIXME Also we do not know if the previous section was completed or not. We need to get this information somehow.
        const sectionActions = getResponse(interview, '_sections._actions', []) as {
            section: string;
            iterationContext?: string[];
            action: string;
            ts: number;
        }[];
        const sectionAction = {
            section: userAction.targetSection.sectionShortname,
            action: 'start',
            ts: moment().unix()
        } as any;
        // Add iteration context to the action and subsection
        if (userAction.targetSection.iterationContext !== undefined) {
            valuesByPath[
                `response._sections.${userAction.targetSection.sectionShortname}.${userAction.targetSection.iterationContext.join('/')}._startedAt`
            ] = moment().unix();
            sectionAction.iterationContext = userAction.targetSection.iterationContext;
        }
        sectionActions.push(sectionAction);
        valuesByPath['response._sections._actions'] = sectionActions;
    } else if (userAction.type === 'languageChange') {
        valuesByPath['response._language'] = userAction.language;
    }
    // widgetInteraction user actions do not have side effects on the response,
    // so we do not need to handle them here. The event is self contained and
    // will automatically update the interview.
    return valuesByPath;
};
