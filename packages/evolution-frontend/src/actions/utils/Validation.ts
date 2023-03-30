import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { ValidationFunction, LangData } from 'evolution-common/lib/services/widgets';

/**
 * Check the validations for a specific value
 * @param validations The validation functions or undefined if no function
 * @param value The value of the widget
 * @param customValue Any custom value associated with this widget
 * @param interview The interview data
 * @param path The path of the current widget to validate
 * @param customPath The custom path
 * @returns An array where the first value is a boolean indicating if the value
 * is valid and the second value is the error message if the value is invalid
 */
export const checkValidations = <Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>(
    validations: ValidationFunction<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> | undefined,
    value: unknown | undefined,
    customValue: unknown | undefined,
    interview: UserInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>,
    path: string,
    customPath?: string
): [boolean, LangData<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se> | undefined] => {
    if (typeof validations === 'function') {
        try {
            const validationsGroup = validations(value, customValue, interview, path, customPath);
            for (let i = 0; i < validationsGroup.length; i++) {
                if (validationsGroup[i].validation === true) {
                    return [false, validationsGroup[i].errorMessage];
                }
            }
        } catch (error) {
            // If there is an error during validations, just ignore the error and consider the value as valid to make sure we can at least get the next answers without blocking the questionnaire.
            // TODO: add a server-side log of the error and define a better way to deal with errors.
            console.log('validation error', error);
            return [true, undefined];
        }
    }
    return [true, undefined];
};

export const validateAllWidgets = function <Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>(
    interview: UserInterviewAttributes<Su, Ho, Pe, Pl, Ve, Vp, Tr, Se>
) {
    // TODO Move the allWidgetsValid out of the interview type
    return (interview as any).allWidgetsValid;
};
