/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {
    InterviewListAttributes,
    InterviewStatusAttributesBase
} from 'evolution-common/lib/services/interviews/interview';
import { ServerFieldUpdateCallback } from '../services/interviews/serverFieldUpdate';
import { ServerValidation } from '../services/validations/serverValidation';

interface ProjectServerConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> {
    /**
     * Filters the interview object to return minimal data. Used server side
     * before sending validation list to server
     */
    validationListFilter: (
        interview: InterviewListAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>
    ) => InterviewStatusAttributesBase<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>;
    serverUpdateCallbacks: ServerFieldUpdateCallback[];
    serverValidations: ServerValidation;
    roleDefinitions: (() => void) | undefined;
}

export const defaultConfig: ProjectServerConfig<unknown, unknown, unknown, unknown> = {
    validationListFilter: (interview: InterviewListAttributes<unknown, unknown, unknown, unknown>) => {
        const {
            id,
            uuid,
            is_valid,
            is_completed,
            is_validated,
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
            is_valid,
            is_completed,
            is_validated,
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
    roleDefinitions: undefined
};

const projectConfig = Object.assign({}, defaultConfig);

/**
 * Set the project specific server side configurations.
 *
 * @param config The project specific configuration elements
 */
export const setProjectConfig = <CustomSurvey, CustomHousehold, CustomHome, CustomPerson>(
    config: Partial<ProjectServerConfig<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>>
) => {
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
