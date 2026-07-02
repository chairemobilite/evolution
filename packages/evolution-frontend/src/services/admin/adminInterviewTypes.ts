/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import type { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';

/** Admin interview with optional deserialized survey objects and audits from `correctInterview`. */
export type AdminInterviewAttributes = UserRuntimeInterviewAttributes & {
    surveyObjectsAndAudits?: SurveyObjectsWithAudits;
};
