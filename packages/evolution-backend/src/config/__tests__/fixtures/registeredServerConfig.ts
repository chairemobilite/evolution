/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// A module a survey could register, to be loaded by the registry under test
import { SurveyObjectParsers } from '../../../services/audits/types';

export const surveyObjectParsers: SurveyObjectParsers = {
    // Marks the person, so that a test can tell whether this module was loaded
    person: (personAttributes) => ({ ...personAttributes, _parsed: true })
};

export default surveyObjectParsers;
