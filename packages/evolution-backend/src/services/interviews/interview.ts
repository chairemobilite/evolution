/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _cloneDeep from 'lodash/cloneDeep';
import moment from 'moment';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import serverValidate, { ServerValidation } from '../validations/serverValidation';
import serverUpdateField from './serverFieldUpdate';
import config from 'chaire-lib-backend/lib/config/server.config';
import interviewsDbQueries from '../../models/interviews.db.queries';
import projectConfig from '../../config/projectConfig';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { InterviewAttributes, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

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
 * could be `{ 'responses.mySection.myField': 'myValue' }`.
 * @param {string[] | undefined} options.unsetPaths - array of dot-separated
 * paths whose value to unset.
 * @param {ServerValidation | undefined} options.serverValidations - Server-side
 * validations to do on the data. If any new field to set does not validate, the
 * value will be set in the responses object, but a corresponding value will be
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
        logDatabaseUpdates?: boolean;
        valuesByPath: { [key: string]: unknown };
        unsetPaths?: string[];
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
    const fieldsToUpdate = options.fieldsToUpdate || ['responses', 'validations'];
    const logData = options.logData || {};
    const serverValidations = await serverValidate(
        interview,
        options.serverValidations,
        options.valuesByPath,
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
            logDatabaseUpdates: options.logDatabaseUpdates,
            valuesByPath: serverValuesByPath,
            fieldsToUpdate: options.fieldsToUpdate,
            logData: { server: true }
        });
        options.deferredUpdateCallback!(serverValuesByPath);
    };
    // Update values by path with caller provided values
    setInterviewFields(interview, { valuesByPath: options.valuesByPath, unsetPaths: options.unsetPaths });
    const [serverValuesByPath, redirectUrl] = await serverUpdateField(
        interview,
        projectConfig.serverUpdateCallbacks,
        options.valuesByPath,
        options.unsetPaths,
        options.deferredUpdateCallback !== undefined ? deferredSaveFct : undefined
    );
    // Update values with server updated values
    if (Object.keys(serverValuesByPath).length > 0) {
        setInterviewFields(interview, { valuesByPath: serverValuesByPath, unsetPaths: options.unsetPaths });
    }
    // If server validation failed, add the invalid fields to validation
    if (serverValidations !== true) {
        for (const path in serverValidations) {
            _set(interview.validations, `${path}`, false);
        }
    }
    interview.responses = interview.responses || {};
    interview.validations = interview.validations || {};
    if (!interview.logs || !Array.isArray(interview.logs)) {
        interview.logs = [];
        //console.log(interview.logs);
    }

    const databaseUpdateJson: Partial<InterviewAttributes> = {};
    fieldsToUpdate.forEach((field) => {
        // FIXME: For some reason, the following line gives type error, not sure why, so casting to any and disabling the warning.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (databaseUpdateJson as any)[field] = interview[field];
    });

    // logs if configured:
    // FIXME Type evolution's configs
    if (options.logDatabaseUpdates !== false && (config as any).logDatabaseUpdates) {
        const timestamp = interview.responses._updatedAt || moment().unix();
        if (options.unsetPaths) {
            interview.logs.push({
                ...logData,
                timestamp,
                valuesByPath: options.valuesByPath,
                unsetPaths: options.unsetPaths
            });
        } else {
            interview.logs.push({
                ...logData,
                timestamp,
                valuesByPath: options.valuesByPath
            });
        }
        databaseUpdateJson.logs = interview.logs;
    }

    // Freeze the interviews when they are marked validated or completed (the participant won't be able to change the answers anymore)
    if (!_isBlank(databaseUpdateJson.is_valid) || !_isBlank(databaseUpdateJson.is_completed)) {
        databaseUpdateJson.is_frozen = true;
    }
    const retInterview = await interviewsDbQueries.update(interview.uuid, databaseUpdateJson);
    return { interviewId: retInterview.uuid, serverValidations, serverValuesByPath, redirectUrl };
};

export const copyResponsesToValidatedData = async (interview: InterviewAttributes) => {
    // TODO The frontend code that was replaced by this method said: // TODO The copy to validated_data should include the audit

    // Keep the _validationComment from current validated_data, then copy original responses
    const validationComment = interview.validated_data ? interview.validated_data._validationComment : undefined;
    interview.validated_data = _cloneDeep(interview.responses);
    interview.validated_data._validatedDataCopiedAt = moment().unix();
    if (validationComment) {
        interview.validated_data._validationComment = validationComment;
    }
    await interviewsDbQueries.update(interview.uuid, { validated_data: interview.validated_data });
};
