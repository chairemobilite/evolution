/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { ExtendedHouseholdAttributes } from 'evolution-common/lib/services/baseObjects/Household';
import { ExtendedJourneyAttributes } from 'evolution-common/lib/services/baseObjects/Journey';
import { ExtendedSegmentAttributes } from 'evolution-common/lib/services/baseObjects/Segment';
import { ExtendedVisitedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { ExtendedTripAttributes } from 'evolution-common/lib/services/baseObjects/Trip';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Parser function type for converting survey response values to proper types
 * before object validation. For example, converting 'yes'/'no' strings to boolean values.
 * Parsers modify the corrected response in place.
 */
export type SurveyObjectParserInterview<TInput> = (attributes: TInput) => void;
export type SurveyObjectParser<TInput, CorrectedResponse> = (
    attributes: TInput,
    correctedResponse: CorrectedResponse
) => void;

/**
 * Configuration for survey object parsers.
 * Each parser takes the corrected response and modifies the response data in place
 * to convert string choice values to proper types before object creation.
 */
export type SurveyObjectParsers = {
    interview?: SurveyObjectParserInterview<CorrectedResponse>;
    household?: SurveyObjectParser<ExtendedHouseholdAttributes, CorrectedResponse>;
    home?: SurveyObjectParser<ExtendedPlaceAttributes, CorrectedResponse>;
    person?: SurveyObjectParser<ExtendedPersonAttributes, CorrectedResponse>;
    journey?: SurveyObjectParser<ExtendedJourneyAttributes, CorrectedResponse>;
    visitedPlace?: SurveyObjectParser<ExtendedVisitedPlaceAttributes, CorrectedResponse>;
    trip?: SurveyObjectParser<ExtendedTripAttributes, CorrectedResponse>;
    segment?: SurveyObjectParser<ExtendedSegmentAttributes, CorrectedResponse>;
};
