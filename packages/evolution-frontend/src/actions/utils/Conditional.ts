/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import { GroupedChoiceType, ChoiceType, isGroupedChoice } from 'evolution-common/lib/services/questionnaire/types';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { ParsingFunction, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

// FIXME: This type is very close to the ParsingFunction type in the frontendHelpers, but it has also a customPath. Is it required? Ideally, we could use the ParsingFunction type
export type ConditionalFunction = (
    interview: UserInterviewAttributes,
    path: string,
    customPath?: string,
    user?: CliUser
) => boolean | [boolean] | [boolean, unknown] | [boolean, unknown, unknown];

/**
 * Validate a conditional value and return the result
 * @param conditional The conditional value of function
 * @param interview The interview
 * @param path The path of the value to conditionally test
 * @param customPath custom path.
 * @param user The current user
 * @returns An array, where the first value is whether the condition result. The
 * second and third elements are the values to set to this field (2nd: value and 3rd: customValue for customChoice) if the
 * condition fails.
 */
export const checkConditional = (
    conditional: undefined | boolean | [boolean, unknown] | [boolean, unknown, unknown] | ConditionalFunction,
    interview: UserInterviewAttributes,
    path: string,
    customPath?: string,
    user?: CliUser
): [boolean, unknown, unknown] => {
    if (conditional === undefined) {
        return [true, undefined, undefined];
    }
    if (typeof conditional === 'boolean') {
        return [conditional, undefined, undefined];
    }
    if (Array.isArray(conditional)) {
        return [conditional[0], conditional[1], conditional[2]];
    } else if (typeof conditional === 'function') {
        try {
            const conditionalResult = conditional(interview, path, customPath, user);
            if (typeof conditionalResult === 'boolean') {
                return [conditionalResult, undefined, undefined];
            } else if (Array.isArray(conditionalResult)) {
                // there is assigned values
                return [
                    conditionalResult[0],
                    conditionalResult[1] !== undefined ? conditionalResult[1] : undefined,
                    conditionalResult[2] !== undefined
                        ? conditionalResult[2]
                        : conditionalResult[1] !== undefined
                            ? null
                            : undefined
                ];
            } else {
                surveyHelper.devLog(`Widget returned a non boolean condition: ${path}`);
                return [Boolean(conditionalResult), undefined, undefined];
            }
        } catch (error) {
            // If there is an error during conditional check, just ignore the error and hide the field to reduce probability of side-effects.
            // TODO: define a better way to deal with errors.
            console.log(`conditional error for ${path}`, error);
            return [false, undefined, undefined];
        }
    } else {
        return [true, undefined, undefined];
    }
};

/**
 * Validate a choice conditional value and return the result
 * @param conditional The choice conditional value of function
 * @param interview The interview
 * @param path The path of the value to conditionally test
 * @param user The current user
 * @returns An array, where the first value is whether the condition result. The
 * second are the values to set to this field if the
 * condition fails.
 */
export const checkChoiceConditional = (
    conditional: undefined | boolean | [boolean, unknown] | ParsingFunction<boolean | [boolean] | [boolean, unknown]>,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
): [boolean, unknown] => {
    if (conditional === undefined) {
        return [true, undefined];
    }
    if (typeof conditional === 'boolean') {
        return [conditional, undefined];
    }
    if (Array.isArray(conditional)) {
        return [conditional[0], conditional[1] !== undefined ? conditional[1] : undefined];
    } else {
        try {
            const conditionalResult = conditional(interview, path, user);
            if (typeof conditionalResult === 'boolean') {
                return [conditionalResult, undefined];
            } else if (conditionalResult.length && conditionalResult.length > 1) {
                // there is assigned values
                return [conditionalResult[0], conditionalResult[1]];
            } else {
                return [conditionalResult[0], undefined];
            }
        } catch (error) {
            // If there is an error during conditional check, just ignore the error and hide the field to reduce probability of side-effects.
            // TODO: add a server-side log of the error and define a better way to deal with errors.
            console.log('choice conditional error', error);
            return [false, undefined];
        }
    }
};

/**
 * Check whether all selected choices are still visible, or if we need to change
 * the value of the response
 * @param choices the widget choices or grouped choices
 * @param interview The interview
 * @param path The path of the value to conditionally test
 * @param user The current user
 * @returns An array, where the first value is whether all selected choices are
 * still visible. The second element is the value to set to this field if the
 * condition fails.
 */
export const checkChoicesConditional = (
    value: unknown,
    choices: (GroupedChoiceType | ChoiceType)[] | ParsingFunction<(GroupedChoiceType | ChoiceType)[]>,
    interview: UserInterviewAttributes,
    path: string,
    user?: CliUser
): [boolean, unknown] => {
    if (_isBlank(value)) {
        return [true, undefined];
    }
    const valueAsArray = Array.isArray(value) ? value : [value]; // value can be multiple choices (array)

    // Get the value along with its corresponding choice
    const parsedChoices = (typeof choices === 'function' ? choices(interview, path, user) : choices).flatMap(
        (choice) => {
            return isGroupedChoice(choice) ? (choice as GroupedChoiceType).choices : [choice];
        }
    );
    // Array of [value, [conditional Response, new value]]
    const valueAndChoices = valueAsArray.map((value) => {
        const choice = parsedChoices.find((ch) => ch.value === value);
        return [value, choice ? checkChoiceConditional(choice.conditional, interview, path, user) : [false, undefined]];
    });
    if (valueAndChoices.find((valueAndChoice) => valueAndChoice[1][0] !== true) === undefined) {
        // All selected choices are still visible
        return [true, value];
    }
    // Some of the selected choices are not visible anymore, remove from value
    // and replace with corresponding value if necessary
    const modifiedValue: unknown[] = [];
    for (let i = 0; i < valueAndChoices.length; i++) {
        const [currentValue, [condResult, newValue]] = valueAndChoices[i];
        if (condResult) {
            modifiedValue.push(currentValue);
        } else if (!_isBlank(newValue) && !modifiedValue.includes(newValue)) {
            modifiedValue.push(newValue);
        }
    }
    return [false, Array.isArray(value) ? modifiedValue : modifiedValue[0]];
};
