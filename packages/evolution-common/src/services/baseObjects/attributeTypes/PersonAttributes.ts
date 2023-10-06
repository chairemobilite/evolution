/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Should be validated for max 120 years old:
export type Age = number;

export type AgeGroup =
'0-4' | '5-9' | '10-14' | '15-19' | '20-24' | '25-29' |
'30-34' | '35-39' | '40-44' | '45-49' | '50-54' | '55-59' |
'60-64' | '65-69' | '70-74' | '75-79' | '80-84' | '85-89' |
'90-94' | '95-99' | '100-104' | '105-109' | '110-114' | '115-119';
// Most of the time at least age OR age group must be defined

export type Gender = 'female' | 'male' | 'custom';

export type DrivingLicenseOwnership = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

export type TransitPassOwnership = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

export type CarsharingMember = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

// Be careful how the question is asked. Used carsharing service in the previous 30 days, previous 6 months?
// This should denote whether a person can use carsharing service/knows how to use it:
export type CarsharingUser = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

export type BikesharingMember = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

// Be careful how the question is asked. Used bikesharing service in the previous 30 days, previous 6 months?
// This should denote whether a person can use bikesharing service/knows how to use it:
export type BikesharingUser = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

export type RidesharingMember = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

// Be careful how the question is asked. Used ridesharing service in the previous 30 days, previous 6 months?
// This should denote whether a person can use ridesharing service/knows how to use it:
export type RidesharingUser = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

// A person can have multiple occupations, like fullTimeStudent + partTimeWorker:
export type Occupation = 'fullTimeWorker' | 'partTimeWorker' |
'fullTimeStudent' | 'partTimeStudent' |
'retired' | 'atHome' | 'other' | 'nonApplicable';

export type JobCategory = string | 'dontKnow' | 'nonApplicable'; // TODO: add job categories from official source if possible and document it
export type JobName = string;
export type IsOnTheRoadWorker = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

// Whether the job is compatible with telecommute:
export type IsJobTelecommuteCompatible = 'yes' | 'no' | 'dontKnow' | 'nonApplicable';

export type EducationalAttainment = string | 'dontKnow' | 'nonApplicable'; // TODO: add educational attainments from official source if possible and document it
