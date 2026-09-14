/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { SurveyObjectParsers } from 'evolution-backend/lib/services/audits/types';

/**
 * Parsers that convert the responses of this survey into what the survey objects
 * expect, before they are created and validated. A real survey converts here the
 * values of a question the model knows under another name or another type,
 * usually caused by a typo in a response attribute or when a survey needs some
 * data conversion.
 *
 * A parser returns a copy of the attributes it received, never the attributes
 * themselves.
 */
const surveyObjectParsers: SurveyObjectParsers = {
    person: (personAttributes) => ({ ...personAttributes, _parsed: true })
};

export default surveyObjectParsers;
