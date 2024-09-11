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
 *
 * @param {Object} args The arguments to pass to the registration call
 * @param {string} args.opName The name of the operation to register
 * @param {unknown} args.opUniqueId The unique identifier of the operation. It
 * should be such that when comparing with `===` returns true, it is the same
 * operation. Otherwise, it is a different one.
 * @param {Function} args.operation  The operation to register is a function
 *     that receives a `isCancelled` callback to verify the cancellation status
 *     of the operation. The execution itself should be done in this function.
 *     It should return an object where the keys are the path in the responses
 *     field and the value is the value to update.
 *
 *     It is the responsibility of the operation to check if it is cancelled once
 *     in a while. A good practice is to check it at least every 100ms, or at
 *     least every 1000 iterations of a loop. If a cancelled operation
 *     terminates, its values will be ignored.
 */
type RegisterUpdateOperationType = (args: {
    opName: string;
    opUniqueId: unknown;
    operation: (isCancelled: () => boolean) => Promise<FieldUpdateCallbackResponseCallbackType>;
}) => Promise<void>;

/**
 * Type for callbacks when a response field gets updated.
 */
export type ServerFieldUpdateCallback = {
    field: string | { regex: string };
    /**
     *
     * @param interview The interview to update
     * @param newValue The new value to set for the field, as received from the
       client
     * @param path The path of the value to update in the interview
     * @param registerUpdateOperation A function that can optionally be called
     * to register a long-running, time-consuming operations. This will run the
     * operation in the background and will not block the current update call.
     * When the response is obtained, it will automatically notify the interview
     * to save the responses data and send it back to the client later, if
     * necessary. To avoid many operations running at the same time for a given
     * field, the registration function takes a name to associate with, and a
     * unique operation identifier. If an operation with the same name is
     * registered again with the same identifier, it will be ignored. Otherwise,
     * it will cancel the previous operation and start the new one.
     *
     * Not that a single server update callback can register multiple
     * operations, if they are under different names.
     * @returns
     */
    callback: (
        interview: InterviewAttributes,
        newValue: unknown | undefined,
        path: string,
        registerUpdateOperation?: RegisterUpdateOperationType
    ) => Promise<FieldUpdateCallbackReturnType>;
    /**
     * Indicate whether to run this field update callback on validated data as
     * well, or if it is only for responses. Defaults to false, ie only
     * responses from the survey participant will trigger this callback, not
     * validations.
     * */
    runOnValidatedData?: boolean;
};

const waitExecuteCallback = async (
    interview: InterviewAttributes,
    callbackPromise: Promise<FieldUpdateCallbackReturnType>,
    completePath: string
): Promise<[{ [affectedResponseFieldPath: string]: unknown }, string | undefined]> => {
    try {
        const serverValuesByPath = {};
        const callbackResponse = await callbackPromise;
        const [updatedValuesByPath, redirectUrl] = Array.isArray(callbackResponse)
            ? callbackResponse
            : [callbackResponse, undefined];
        Object.keys(updatedValuesByPath).forEach((key) => {
            if (getResponse(interview, key as any, undefined) !== updatedValuesByPath[key]) {
                serverValuesByPath[
                    completePath.startsWith('validated_data.') ? `validated_data.${key}` : `responses.${key}`
                ] = updatedValuesByPath[key];
            }
        });
        return [serverValuesByPath, redirectUrl];
    } catch (error) {
        console.error(`Error executing field update callback for path ${completePath}: ${error}`);
        return [{}, undefined];
    }
};

type UpdateCallbackForPathResponseType = {
    responsePath: string;
    callback: ServerFieldUpdateCallback;
    completePath: string;
};
const getUpdateCallbackForPath = (
    serverUpdateCallbacks: ServerFieldUpdateCallback[],
    path: string
): UpdateCallbackForPathResponseType | undefined => {
    if (!path.startsWith('responses.') && !path.startsWith('validated_data.')) {
        return undefined;
    }
    const isValidatedData = path.startsWith('validated_data.');
    const responsePath = !isValidatedData
        ? path.substring('responses.'.length)
        : path.substring('validated_data.'.length);
    const serverCallback = serverUpdateCallbacks.find(({ field }) =>
        typeof field === 'string' ? responsePath === field : responsePath.match(field.regex) !== null
    );
    return serverCallback !== undefined && (!isValidatedData || serverCallback.runOnValidatedData === true)
        ? { responsePath, callback: serverCallback, completePath: path }
        : undefined;
};

class InterviewUpdateOperation {
    private static runningQueries: { [interviewId: string]: { [opName: string]: unknown } } = {};

    private static getCurrentOperation = (opName: string, interviewId: string) => {
        return (InterviewUpdateOperation.runningQueries[interviewId] || {})[opName];
    };

    constructor(
        private interviewUuid: string,
        private deferredUpdateCallback: (valuesByPath: { [key: string]: unknown }) => Promise<void>
    ) {
        // Nothing else to do
    }

    public registerOperation = async (args: {
        opName: string;
        opUniqueId: unknown;
        operation: (isCancelled: () => boolean) => Promise<{ [path: string]: unknown }>;
    }): Promise<void> => {
        const currentOp = InterviewUpdateOperation.getCurrentOperation(args.opName, this.interviewUuid);
        if (currentOp !== undefined && currentOp === args.opUniqueId) {
            // The same operation is already running, ignore
            return;
        }
        // Register the current operation
        InterviewUpdateOperation.runningQueries[this.interviewUuid] = {
            ...(InterviewUpdateOperation.runningQueries[this.interviewUuid] || {}),
            [args.opName]: args.opUniqueId
        };
        const isCancelled = () =>
            InterviewUpdateOperation.getCurrentOperation(args.opName, this.interviewUuid) !== args.opUniqueId;
        try {
            const responsesByPath = await args.operation(isCancelled);
            if (isCancelled()) {
                return;
            }

            // Convert the responses to the format expected by the deferred callback
            const asyncServerValuesByPath = {};
            Object.keys(responsesByPath).forEach((key) => {
                asyncServerValuesByPath[`responses.${key}`] = responsesByPath[key];
            });

            // Call the update callback
            this.deferredUpdateCallback(asyncServerValuesByPath);
        } catch (error) {
            console.log(
                'error while running server update callback operation for interview %s, name %s, opId %s: %s',
                this.interviewUuid,
                args.opName,
                args.opUniqueId,
                error
            );
        } finally {
            // Reset the callback for this name
            if (!isCancelled()) {
                delete InterviewUpdateOperation.runningQueries[this.interviewUuid][args.opName];
            }
        }
    };
}

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
 * @param {((valuesByPath: { [key: string]: any }) => Promise<void> |
 * undefined)} deferredUpdateCallback A callback passed to the server update
 * callbacks, that can be optionally called to send the response to the client.
 * It should be used by update callbacks that can take a lot of time to execute
 * instead of blocking the current update call.
 * @return {*}  {Promise<{ [key: string]: any }>}
 */
const updateFields = async (
    interview: InterviewAttributes,
    serverUpdateCallbacks: ServerFieldUpdateCallback[],
    valuesByPath: { [key: string]: unknown },
    unsetValues?: string[],
    deferredUpdateCallback?: (valuesByPath: { [key: string]: unknown }) => Promise<void>
): Promise<[{ [key: string]: any }, string | undefined]> => {
    if (serverUpdateCallbacks.length === 0) {
        return [{}, undefined];
    }

    const serverValuesByPath = {};
    let redirectUrl: string | undefined = undefined;

    const callbacks = Object.keys(valuesByPath)
        .map((path) => getUpdateCallbackForPath(serverUpdateCallbacks, path))
        .filter((callbackPair) => callbackPair !== undefined) as UpdateCallbackForPathResponseType[];

    // Map callback results to responses before calling the asynchronous execution callback is specified
    const deferredCallback =
        deferredUpdateCallback !== undefined
            ? new InterviewUpdateOperation(interview.uuid, deferredUpdateCallback).registerOperation
            : undefined;

    for (let i = 0; i < callbacks.length; i++) {
        const { responsePath, callback, completePath } = callbacks[i];
        const [updatedValuesByPath, callbackUrl] = await waitExecuteCallback(
            interview,
            callback.callback(interview, valuesByPath[completePath], responsePath, deferredCallback),
            completePath
        );
        Object.assign(serverValuesByPath, updatedValuesByPath);
        if (callbackUrl !== undefined) {
            redirectUrl = callbackUrl;
        }
    }
    if (unsetValues) {
        const callbacks = unsetValues
            .map((path) => getUpdateCallbackForPath(serverUpdateCallbacks, path))
            .filter((callbackPair) => callbackPair !== undefined) as UpdateCallbackForPathResponseType[];
        for (let i = 0; i < callbacks.length; i++) {
            const { responsePath, callback, completePath } = callbacks[i];
            const [updatedValuesByPath, callbackUrl] = await waitExecuteCallback(
                interview,
                callback.callback(interview, undefined, responsePath, deferredCallback),
                completePath
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
