/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { ServerFieldUpdateCallback } from '../services/interviews/serverFieldUpdate';
import { ServerValidation } from '../services/validations/serverValidation';
import {
    InterviewAttributes,
    InterviewListAttributes,
    InterviewStatusAttributesBase
} from 'evolution-common/lib/services/questionnaire/types';

interface ProjectServerConfig {
    /**
     * Simplify the interview object to return minimal data.
     * The filter will choose which fields to keep in the simplified interview.
     * Used server side before sending interview list to server
     */
    simplifiedInterviewListFilter: (interview: InterviewListAttributes) => InterviewStatusAttributesBase;
    serverUpdateCallbacks: ServerFieldUpdateCallback[];
    serverValidations: ServerValidation;
    roleDefinitions: (() => void) | undefined;
    /**
     * This function is provided by surveys to validate and audit the complete responses.
     * It will receive the content of the validated_data and should return the
     * individual audits. It is optional. If the survey does not require auditing, just leave blank.
     */
    auditInterview?: (attributes: InterviewAttributes) => Promise<SurveyObjectsWithAudits>;
    /**
     * Configuration of a Transition instance for route calculations. If not
     * set, route calculations will not use the Transition public API for
     * eventual route calculations.
     */
    transitionApi?: {
        /**
         * URL for the Transition API. Can be set by setting the
         * TRANSITION_API_URL environment variable
         */
        url: string;
        /**
         * Username for the Transition API. Can be set by setting the
         * TRANSITION_API_USERNAME environment variable
         */
        username: string;
        /**
         * Password for the Transition API. Can be set by setting the
         * TRANSITION_API_PASSWORD environment variable
         */
        password: string;
    };
}

export const defaultConfig: ProjectServerConfig = {
    simplifiedInterviewListFilter: (interview: InterviewListAttributes) => {
        const {
            id,
            uuid,
            created_at,
            is_valid,
            is_completed,
            is_validated,
            is_questionable,
            username,
            facebook,
            google,
            responses,
            validated_data,
            audits
        } = interview;
        return {
            id,
            uuid,
            created_at,
            is_valid,
            is_completed,
            is_validated,
            is_questionable,
            username,
            facebook,
            google,
            responses: {
                _isCompleted: responses?._isCompleted,
                household: { size: responses?.household?.size },
                _validationComment: validated_data?._validationComment
            },
            audits
        };
    },
    serverUpdateCallbacks: [],
    serverValidations: undefined,
    roleDefinitions: undefined,
    auditInterview: undefined
};

const projectConfig = Object.assign({}, defaultConfig);

/**
 * Set the project specific server side configurations.
 *
 * @param config The project specific configuration elements
 */
export const setProjectConfig = (config: Partial<ProjectServerConfig>) => {
    // Try to set the transition API object from the environment variables.
    // FIXME For now, it is either set in the config or in the environment
    // variables. Consider a mix to support for example url in config and
    // credentials in env.
    if (!config.transitionApi) {
        const transitionUrl = process.env.TRANSITION_API_URL;
        const transitionUsername = process.env.TRANSITION_API_USERNAME;
        const transitionPassword = process.env.TRANSITION_API_PASSWORD;
        if (transitionUrl && transitionUsername && transitionPassword) {
            config.transitionApi = {
                url: transitionUrl,
                username: transitionUsername,
                password: transitionPassword
            };
        }
    }
    Object.assign(projectConfig, config);
};

/**
 * Register server-side callbacks to be called when certain fields are updated.
 * These callbacks are used to add/modify field values in the interview
 * depending on certain other responses fields.
 *
 * @param serverCallbacks An array of callbacks to call when responses are
 * updated
 */
export const registerServerUpdateCallbacks = (serverCallbacks: ServerFieldUpdateCallback[]) => {
    projectConfig.serverUpdateCallbacks = serverCallbacks;
};

export default projectConfig;
