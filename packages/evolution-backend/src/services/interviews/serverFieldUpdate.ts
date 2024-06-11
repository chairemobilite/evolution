import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import prefilledDbQueries from '../../models/interviewsPreFill.db.queries';

/**
 * Return type of the values to update in the responses. The keys is the
 * complete path in the 'responses' field and the value is the new value for
 * this field.
 */
type FieldUpdateCallbackResponseCallbackType = { [affectedResponseFieldPath: string]: unknown };
/**
 * Return type of the callback. Either an object with the fields in the
 * 'responses' to update, or an array with the fields to update, as well as an
 * external URL to which to redirect. Redirecting to an external URL will
 * terminate the interview for the user.
 */
type FieldUpdateCallbackReturnType =
    | FieldUpdateCallbackResponseCallbackType
    | [FieldUpdateCallbackResponseCallbackType, string];

/**
 * Type for callbacks when a response field gets updated.
 */
export type ServerFieldUpdateCallback = {
    field: string | { regex: string };
    callback: (
        interview: InterviewAttributes,
        newValue: unknown | undefined,
        path: string
    ) => Promise<FieldUpdateCallbackReturnType>;
};

const waitExecuteCallback = async (
    interview: InterviewAttributes,
    callbackPromise: Promise<FieldUpdateCallbackReturnType>,
    path: string
): Promise<[{ [affectedResponseFieldPath: string]: unknown }, string | undefined]> => {
    try {
        const serverValuesByPath = {};
        const callbackResponse = await callbackPromise;
        const [updatedValuesByPath, redirectUrl] = Array.isArray(callbackResponse)
            ? callbackResponse
            : [callbackResponse, undefined];
        Object.keys(updatedValuesByPath).forEach((key) => {
            if (getResponse(interview, key as any, undefined) !== updatedValuesByPath[key]) {
                serverValuesByPath[`responses.${key}`] = updatedValuesByPath[key];
            }
        });
        return [serverValuesByPath, redirectUrl];
    } catch (error) {
        console.error(`Error executing field update callback for path ${path}: ${error}`);
        return [{}, undefined];
    }
};

const getUpdateCallbackForPath = (
    serverUpdateCallbacks: ServerFieldUpdateCallback[],
    path: string
): [string, ServerFieldUpdateCallback] | undefined => {
    if (!path.startsWith('responses.')) {
        return undefined;
    }
    const responsePath = path.substring('responses.'.length);
    const serverCallback = serverUpdateCallbacks.find(({ field }) =>
        typeof field === 'string' ? responsePath === field : responsePath.match(field.regex) !== null
    );
    return serverCallback !== undefined ? [responsePath, serverCallback] : undefined;
};

/**
 * Get the values by path that should be updated, given the current values by
 * path.
 *
 * It returns an object, compatible with the valuesByPath parameter, where the
 * key is the complete path in the interview (including the 'responses.' prefix)
 * and the value is the value to set in the interview. If the value returned by
 * server update callback is the same as the previous value in the interview, it
 * won't be returned.
 *
 * @param {InterviewAttributes} interview The complete interview to update
 * @param {ServerFieldUpdateCallback | undefined} serverUpdateCallbacks The
 * callbacks to call when fields are updated
 * @param {{ [key: string]: any }} valuesByPath The valuesByPath to update
 * @param {string[]} unsetValues The valuesbyPath to set to undefined
 * @return {*}  {Promise<{ [key: string]: any }>}
 */
const updateFields = async (
    interview: InterviewAttributes,
    serverUpdateCallbacks: ServerFieldUpdateCallback[],
    valuesByPath: { [key: string]: unknown },
    unsetValues?: string[]
): Promise<[{ [key: string]: any }, string | undefined]> => {
    if (serverUpdateCallbacks.length === 0) {
        return [{}, undefined];
    }

    const serverValuesByPath = {};
    let redirectUrl: string | undefined = undefined;

    const callbacks = Object.keys(valuesByPath)
        .map((path) => getUpdateCallbackForPath(serverUpdateCallbacks, path))
        .filter((callbackPair) => callbackPair !== undefined);
    for (let i = 0; i < callbacks.length; i++) {
        const [path, serverCallback] = callbacks[i] as [string, ServerFieldUpdateCallback];
        const [updatedValuesByPath, callbackUrl] = await waitExecuteCallback(
            interview,
            serverCallback.callback(interview, valuesByPath[`responses.${path}`], path),
            path
        );
        Object.assign(serverValuesByPath, updatedValuesByPath);
        if (callbackUrl !== undefined) {
            redirectUrl = callbackUrl;
        }
    }
    if (unsetValues) {
        const callbacks = unsetValues
            .map((path) => getUpdateCallbackForPath(serverUpdateCallbacks, path))
            .filter((callbackPair) => callbackPair !== undefined);
        for (let i = 0; i < callbacks.length; i++) {
            const [path, serverCallback] = callbacks[i] as [string, ServerFieldUpdateCallback];
            const [updatedValuesByPath, callbackUrl] = await waitExecuteCallback(
                interview,
                serverCallback.callback(interview, undefined, path),
                path
            );
            Object.assign(serverValuesByPath, updatedValuesByPath);
            if (callbackUrl !== undefined) {
                redirectUrl = callbackUrl;
            }
        }
    }

    return [serverValuesByPath, redirectUrl];
};

export type PreFillResponses = {
    [path: string]: {
        value: unknown;
        actionIfPresent: 'force' | 'doNothing';
    };
};

/**
 * Get prefilled responses by path. The keys in the return value is the complete
 * path in the interview responses and the value is the value of this response
 * field. Only the responses that need to be updated are returned. If a value is
 * already set and the field should not be forced, or if the value is the same,
 * it won't be returned
 *
 * @param referenceValue The reference value for which to get the prefilled
 * answers
 * @param interview The interview to update
 * @returns The responses to update
 */
export const getPreFilledResponsesByPath = async (
    referenceValue: string,
    interview: InterviewAttributes
): Promise<{ [key: string]: unknown }> => {
    try {
        const prefilledResponses = await prefilledDbQueries.getByReferenceValue(referenceValue);
        if (!prefilledResponses) {
            return {};
        }
        const prefilledValuesByPath = {};
        Object.keys(prefilledResponses).forEach((path) => {
            const { value, actionIfPresent } = prefilledResponses[path];
            const currentResponse = getResponse(interview, path as any);
            if ((currentResponse !== undefined && actionIfPresent !== 'force') || value === currentResponse) {
                return;
            }
            prefilledValuesByPath[path] = value;
        });
        return prefilledValuesByPath;
    } catch (error) {
        console.error(`Error getting prefilled responses for ${referenceValue}: ${error}`);
        return {};
    }
};

export type PreFilledInterviewResponse = {
    [path: string]: { value: unknown; actionIfPresent?: 'force' | 'doNothing' };
};
/**
 * Save in the prefilled responses table the responses for the reference value.
 * The can be later fetched with `getPreFilledResponsesByPath` in a server
 * update callback to fill the interview with those answers
 *
 * @param referenceValue The value to identify this set of responses
 * @param responses The responses to prefill
 */
export const setPreFilledResponses = async (
    referenceValue: string,
    responses: PreFilledInterviewResponse
): Promise<boolean> => {
    try {
        return await prefilledDbQueries.setPreFilledResponsesForRef(referenceValue, responses);
    } catch (error) {
        console.error(`Error setting prefilled responses for ${referenceValue}: ${error}`);
        return false;
    }
};

export default updateFields;
