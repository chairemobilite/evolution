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
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Attributes that could have been erased during validation
 * This is survey-specific and should be provided in options.
 *
 * This mechanism allows restoring respondent preferences and original data that may have been
 * overwritten during admin corrections. For example, the original language used during the
 * respondent interview should be preserved instead of using the language used by the admin
 * who corrected the interview.
 *
 * @example
 * {
 *   interview: ['_language'], // Preserve original interview language
 * }
 */
export type AttributesToRestore = {
    /** Interview-level attributes to restore from original responses */
    interview?: string[];
    /** Household-level attributes to restore from original responses */
    household?: string[];
    /** Home place attributes to restore from original responses */
    home?: string[];
    /** Person-level attributes to restore from original responses */
    person?: string[];
    /** Journey attributes to restore from original responses */
    journey?: string[];
    /** Visited place attributes to restore from original responses */
    visitedPlace?: string[];
    /** Trip attributes to restore from original responses */
    trip?: string[];
    /** Segment attributes to restore from original responses */
    segment?: string[];
};

/**
 * Parser function type for converting survey response values to proper types
 * before object validation. For example, converting 'yes'/'no' strings to boolean values.
 * Parsers modify the interview attributes in place.
 */
export type SurveyObjectParserInterview<TInput> = (attributes: TInput) => void;
export type SurveyObjectParser<TInput, TInterviewAttributes> = (
    attributes: TInput,
    interviewAttributes: TInterviewAttributes
) => void;

/**
 * Configuration for survey object parsers.
 * Each parser takes the interview attributes and modifies the response data in place
 * to convert string choice values to proper types before object creation.
 */
export type SurveyObjectParsers = {
    interview?: SurveyObjectParserInterview<InterviewAttributes>;
    household?: SurveyObjectParser<ExtendedHouseholdAttributes, InterviewAttributes>;
    home?: SurveyObjectParser<ExtendedPlaceAttributes, InterviewAttributes>;
    person?: SurveyObjectParser<ExtendedPersonAttributes, InterviewAttributes>;
    journey?: SurveyObjectParser<ExtendedJourneyAttributes, InterviewAttributes>;
    visitedPlace?: SurveyObjectParser<ExtendedVisitedPlaceAttributes, InterviewAttributes>;
    trip?: SurveyObjectParser<ExtendedTripAttributes, InterviewAttributes>;
    segment?: SurveyObjectParser<ExtendedSegmentAttributes, InterviewAttributes>;
};
