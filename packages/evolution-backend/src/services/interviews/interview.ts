/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _set from 'lodash.set';
import _unset from 'lodash.unset';
import moment from 'moment';
import { UserAttributes } from 'chaire-lib-backend/lib/services/auth/user';
import serverValidate, { ServerValidation } from '../validations/serverValidation';
import serverUpdateField, { ServerFieldUpdateCallback } from './serverFieldUpdate';
import config from 'chaire-lib-backend/lib/config/server.config';
import interviewsDbQueries from '../../models/interviews.db.queries';
import { UserInterviewAttributes, InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import projectConfig from '../../config/projectConfig';

export const addRolesToInterview = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    user: UserAttributes
) => {
    // Add the userRoles in the interview object
    const permissions = user.permissions;
    interview.userRoles = permissions ? Object.keys(permissions).filter((perm) => permissions[perm] === true) : [];
};

export const setInterviewFields = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: InterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
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
 * TODO: Rename to save, as it conveys more the fact that it is saved in the db than update
 *
 * @param {InterviewAttributes} interview The base interview to update, as
 * fetched in the database
 * @param {{valuesByPath: { [key: string]: unknown }; unsetPaths?: string[];
 * serverValidations?: ServerValidation; fieldsToUpdate?: (keyof
 * InterviewAttributes)[]; logData?: { [key: string]: unknown };}} options The
 * `valuesByPath` is a key-value map of values to update in the interview. The
 * key is the dot-separated hierarchical path to the field to update. For
 * example, to update a field in response, it could be `{
 * 'responses.mySection.myField': 'myValue' }`. The `unsetPaths` array is an
 * array of dot-separated paths whose value to unset. The 'serverValidations'
 * are the validations to do on the data. If any new field to set does not
 * validate, the value will be set in the responses object, but a corresponding
 * value will be set to false in the validations object. The 'fieldsToUpdate'
 * makes sure only those fields are updated in the interview. Since there is no
 * control on the paths of the valuesByPath keys, it avoids updating fields in
 * code path where they should not be updated. The 'logData' object contains
 * data that should be added to the log object of the current update, if log is
 * enabled.
 **/
export const updateInterview = async <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    interview: InterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    options: {
        logDatabaseUpdates?: boolean;
        valuesByPath: { [key: string]: unknown };
        unsetPaths?: string[];
        serverValidations?: ServerValidation;
        fieldsToUpdate?: (keyof InterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>)[];
        logData?: { [key: string]: unknown };
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
}> => {
    const fieldsToUpdate = options.fieldsToUpdate || ['responses', 'validations'];
    const logData = options.logData || {};
    const serverValidations = await serverValidate(
        options.serverValidations,
        options.valuesByPath,
        options.unsetPaths || []
    );
    // Update values by path with caller provided values
    setInterviewFields(interview, { valuesByPath: options.valuesByPath, unsetPaths: options.unsetPaths });
    const serverValuesByPath = await serverUpdateField(
        interview,
        projectConfig.serverUpdateCallbacks,
        options.valuesByPath,
        options.unsetPaths
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

    const databaseUpdateJson: Partial<InterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>> =
        {};
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

    const retInterview = await interviewsDbQueries.update(interview.uuid, databaseUpdateJson);
    return { interviewId: retInterview.uuid, serverValidations, serverValuesByPath };
};
