/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export type ChoiceDontKnow = 'dontKnow';
export type ChoiceNonApplicable = 'nonApplicable';
export type ChoiceYes = 'yes';
export type ChoiceNo = 'no';

export type ChoicesYesNoDontKnow = ChoiceYes | ChoiceNo | ChoiceDontKnow;
export type ChoicesYesNoDontKnowNonApplicable = ChoiceYes | ChoiceNo | ChoiceDontKnow | ChoiceNonApplicable;
export type ChoicesYesNoNonApplicable = ChoiceYes | ChoiceNo | ChoiceNonApplicable;
export type ChoiceGender = 'female' | 'male' | 'custom';

export type ChoiceAgeGroup =
    | '0-4'
    | '5-9'
    | '10-14'
    | '15-19'
    | '20-24'
    | '25-29'
    | '30-34'
    | '35-39'
    | '40-44'
    | '45-49'
    | '50-54'
    | '55-59'
    | '60-64'
    | '65-69'
    | '70-74'
    | '75-79'
    | '80-84'
    | '85-89'
    | '90-94'
    | '95-99'
    | '100-104'
    | '105-109'
    | '110-114'
    | '115-119'
    | '120-124'
    | '125-129';
// The max of 129 years old should be enough for the time being!
// Using a simple 100+ at the end instead would mean that we need some conversion processes everytime we parse these groups.
// We let the end-user/analyst decide how to merge these even more or choose another max value when needed.
