/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _cloneDeep from 'lodash/cloneDeep';
import _isEqual from 'lodash/isEqual';
import moment from 'moment';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import serverValidate, { ServerValidation } from '../validations/serverValidation';
import serverUpdateField from './serverFieldUpdate';
import interviewsDbQueries from '../../models/interviews.db.queries';
import projectConfig from '../../config/projectConfig';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import {
    InterviewAttributes,
    UserAction,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { ParadataLoggingFunction } from '../logging/paradataLogging';

// Create a DOMPurify instance with a virtual DOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure allowed tags/attributes
const sanitizeConfig = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
};

export const addRolesToInterview = (interview: UserInterviewAttributes, user: UserAttributes) => {
    // Add the userRoles in the interview object
    const permissions = user.permissions;
    interview.userRoles = permissions ? Object.keys(permissions).filter((perm) => permissions[perm] === true) : [];
};

export const setInterviewFields = (
    interview: InterviewAttributes,
    options: {
        valuesByPath: { [key: string]: unknown };
        unsetPaths?: string[];
    }
) => {
    // Set the interview's values by path received from client
    for (const path in options.valuesByPath) {
        const value = options.valuesByPath[path];
        _set(interview, path, value);
    }
    // Unset any interview path defined by client
    if (Array.isArray(options.unsetPaths)) {
        for (let i = 0, count = options.unsetPaths.length; i < count; i++) {
            _unset(interview, options.unsetPaths[i]);
        }
    }
};

// Augment the valuesByPath with the user action data, to fit with the current
// interview update architecture
// FIXME This is just a workaround to avoid having to change the validation and server update code, as they will be revisited
const updateValuesByPathWithUserAction = (
    valuesByPath: { [key: string]: unknown },
    userAction: UserAction
): { [key: string]: unknown } => {
    if (userAction.type === 'widgetInteraction') {
        return { [userAction.path]: userAction.value, ...valuesByPath };
    }
    return valuesByPath;
};

// Apply sanitization to all string fields
const sanitizeInterviewData = (data: any) => {
    if (typeof data === 'string') {
        return purify.sanitize(data, sanitizeConfig);
    } else if (Array.isArray(data)) {
        return data.map(sanitizeInterviewData);
    } else if (typeof data === 'object' && data !== null) {
        for (const key of Object.keys(data)) {
            data[key] = sanitizeInterviewData(data[key]);
        }
    }
    return data;
};

/**
 * Update an interview, given the paths to update. If database logs are
 * configured, a new log will be saved for this update.
 *
 * TODO: Rename to save, as it conveys more the fact that it is saved in the db
 * than update
 *
 * @param {InterviewAttributes} interview The base interview to update, as
 * fetched in the database
 * @param {Object} options - The options to update the interview
 * @param {{ [key: string]: unknown }} options.valuesByPath - A key-value map of
 * values to update in the interview. The key is the dot-separated hierarchical
 * path to the field to update. For example, to update a field in response, it
 * could be `{ 'response.mySection.myField': 'myValue' }`.
 * @param {string[] | undefined} options.unsetPaths - array of dot-separated
 * paths whose value to unset.
 * @param {ServerValidation | undefined} options.serverValidations - Server-side
 * validations to do on the data. If any new field to set does not validate, the
 * value will be set in the response object, but a corresponding value will be
 * set to false in the validations object.
 * @param {(keyof InterviewAttributes)[] | undefined} options.fieldsToUpdate -
 * Array of fields that can be updated in the response. This makes sure only
 * those fields are updated in the interview. Since there is no control on the
 * paths of the valuesByPath keys, it avoids updating fields in code path where
 * they should not be updated
 * @param {{ [key: string]: unknown } | undefined} options.logData - An object
 * contains data that should be added to the log object of the current update,
 * if log is enabled.
 * @param {boolean | undefined} options.logDatabaseUpdates - This can override
 * the default database logging setting to avoid logging certain changes, like
 * auditing. For this value to have effect, logging must be enabled in the
 * configuration.
 * @param {((valuesByPath: { [key: string]: any }) => Promise<void> |
 * undefined)} options.deferredUpdateCallback - A callback passed to the server
 * update callbacks, that can be optionally called to send the response to the
 * client.  It should be used by update callbacks that can take a lot of time to
 * execute instead of blocking the current update call.
 **/
export const updateInterview = async (
    interview: InterviewAttributes,
    options: {
        logUpdate?: ParadataLoggingFunction;
        valuesByPath: { [key: string]: unknown };
        unsetPaths?: string[];
        userAction?: UserAction;
        serverValidations?: ServerValidation;
        fieldsToUpdate?: (keyof InterviewAttributes)[];
        logData?: { [key: string]: unknown };
        deferredUpdateCallback?: (valuesByPath: { [key: string]: unknown }) => Promise<void>;
    }
): Promise<{
    interviewId: string | undefined;
    serverValidations:
        | true
        | {
              [key: string]: {
                  [key: string]: string;
              };
          };
    serverValuesByPath: { [key: string]: unknown };
    redirectUrl: string | undefined;
}> => {
    // FIXME: When validations and side effects are managed server-side, we won't have custom code for server validations and updates and we can send the user action to the `setInterviewFields` directly (issue #858)
    const allValuesByPath = options.userAction
        ? updateValuesByPathWithUserAction(options.valuesByPath, options.userAction)
        : options.valuesByPath;

    // Sanitize all string fields in the valuesByPath, as they may contain javascript injection
    const sanitizedValuesByPath = sanitizeInterviewData(_cloneDeep(allValuesByPath));

    const fieldsToUpdate = options.fieldsToUpdate || ['response', 'validations'];
    const logData = options.logData || {};
    const serverValidations = await serverValidate(
        interview,
        options.serverValidations,
        sanitizedValuesByPath,
        options.unsetPaths || []
    );

    // Generates an execution callback function that will save the asynchronous values by path to set before calling the executionCallback argument
    const deferredSaveFct = async (serverValuesByPath: { [key: string]: unknown }) => {
        // Reload the interview as it may be outdated
        const reloadedInterview = await interviewsDbQueries.getInterviewByUuid(interview.uuid);
        if (!reloadedInterview) {
            return;
        }
        // Call the update function again, but without the execution callback to avoid endless loops if the call is made again
        await updateInterview(reloadedInterview, {
            logUpdate: options.logUpdate,
            valuesByPath: serverValuesByPath,
            fieldsToUpdate: options.fieldsToUpdate,
            logData: { server: true }
        });
        options.deferredUpdateCallback!(serverValuesByPath);
    };
    // Update values by path with caller provided values
    setInterviewFields(interview, { valuesByPath: sanitizedValuesByPath, unsetPaths: options.unsetPaths });
    const [serverValuesByPath, redirectUrl] = await serverUpdateField(
        interview,
        projectConfig.serverUpdateCallbacks,
        sanitizedValuesByPath,
        options.unsetPaths,
        options.deferredUpdateCallback !== undefined ? deferredSaveFct : undefined
    );
    // Update values with server updated values
    if (Object.keys(serverValuesByPath).length > 0) {
        setInterviewFields(interview, { valuesByPath: serverValuesByPath, unsetPaths: options.unsetPaths });
    }
    // Update the sanitized fields by path and send back to the client
    Object.keys(sanitizedValuesByPath).forEach((path) => {
        if (!_isEqual(sanitizedValuesByPath[path], allValuesByPath[path]) && serverValuesByPath[path] === undefined) {
            serverValuesByPath[path] = sanitizedValuesByPath[path];
        }
    });
    // If server validation failed, add the invalid fields to validation
    if (serverValidations !== true) {
        for (const path in serverValidations) {
            _set(interview.validations, `${path}`, false);
        }
    }
    interview.response = interview.response || {};
    interview.validations = interview.validations || {};

    const databaseUpdateJson: Partial<InterviewAttributes> = {};
    fieldsToUpdate.forEach((field) => {
        // FIXME: For some reason, the following line gives type error, not sure why, so casting to any and disabling the warning.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (databaseUpdateJson as any)[field] = interview[field];
    });

    // Freeze the interviews when they are marked validated or completed (the participant won't be able to change the answers anymore)
    if (!_isBlank(databaseUpdateJson.is_valid) || !_isBlank(databaseUpdateJson.is_completed)) {
        databaseUpdateJson.is_frozen = true;
    }
    const retInterview = await interviewsDbQueries.update(interview.uuid, databaseUpdateJson);
    // logs this update event, asynchronously to avoid blocking the flow
    options.logUpdate?.({
        valuesByPath: options.valuesByPath,
        userAction: options.userAction,
        unsetPaths: options.unsetPaths,
        server: !!logData.server
    });
    // Log additional server update if necessary
    if (Object.keys(serverValuesByPath).length > 0) {
        options.logUpdate?.({ valuesByPath: serverValuesByPath, server: true });
    }

    return {
        interviewId: retInterview.uuid,
        serverValidations,
        // FIXME Server valuesByPath assignation is a tweak to send to the
        // client the survey navigation history, as history is written on the
        // server, but navigation is done client-side, because it needs to
        // prepare the widgets.  Navigation should move server-side and this
        // won't be required anymore.
        serverValuesByPath:
            sanitizedValuesByPath['response._sections._actions'] !== undefined
                ? Object.assign({}, serverValuesByPath, { 'response._sections': interview.response._sections })
                : serverValuesByPath,
        redirectUrl
    };
};

export const copyResponseToCorrectedResponse = async (interview: InterviewAttributes) => {
    // TODO The frontend code that was replaced by this method said: // TODO The copy to corrected_response should include the audit

    // Keep the _validationComment from current corrected_response, then copy original response
    const validationComment = interview.corrected_response
        ? interview.corrected_response._validationComment
        : undefined;
    interview.corrected_response = _cloneDeep(interview.response);
    interview.corrected_response._correctedResponseCopiedAt = moment().unix();
    if (validationComment) {
        interview.corrected_response._validationComment = validationComment;
    }
    await interviewsDbQueries.update(interview.uuid, { corrected_response: interview.corrected_response });
};
