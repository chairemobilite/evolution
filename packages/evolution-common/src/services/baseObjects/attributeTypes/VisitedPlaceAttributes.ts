/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// FIXME Consider using the types from `services/odSurvey/types`. The types here
// should be the normalized ones, and questionnaire mapping should point to
// this. It's not being done yet as typing here may break current audits. When
// visited places audits are migrated, try to use the odSurvey types.
export type ActivityCategory = string; // TODO: use normalized activity categories
export type Activity = string; // TODO: use normalized activites
