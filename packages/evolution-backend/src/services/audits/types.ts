/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

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
export type SurveyObjectParser<TInput> = (attributes: TInput) => void;

/**
 * Configuration for survey object parsers.
 * Each parser takes the interview attributes and modifies the response data in place
 * to convert string choice values to proper types before object creation.
 */
export type SurveyObjectParsers = {
    interview?: SurveyObjectParser<any>;
    household?: SurveyObjectParser<any>;
    home?: SurveyObjectParser<any>;
    person?: SurveyObjectParser<any>;
    journey?: SurveyObjectParser<any>;
    visitedPlace?: SurveyObjectParser<any>;
    trip?: SurveyObjectParser<any>;
    segment?: SurveyObjectParser<any>;
};
