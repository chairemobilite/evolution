/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserAction } from 'evolution-common/lib/services/questionnaire/types';

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
