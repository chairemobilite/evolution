/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { YesNoDontKnowNonApplicable, YesNoDontKnowPreferNotToAnswer } from './GenericAttributes';

// Should be validated for max 120 years old:
export type Age = number;

export const ageGroupValues = [
    '0-4',
    '5-9',
    '10-14',
    '15-19',
    '20-24',
    '25-29',
    '30-34',
    '35-39',
    '40-44',
    '45-49',
    '50-54',
    '55-59',
    '60-64',
    '65-69',
    '70-74',
    '75-79',
    '80-84',
    '85-89',
    '90-94',
    '95-99',
    '100-104',
    '105-109',
    '110-114',
    '115-119',
    '120-124',
    '125-129'
] as const;

// age group must be generated. It is a pain to not have exact age.
// not having exact age implies a lot of conditional and validation ambiguities
export type AgeGroup = (typeof ageGroupValues)[number];

export const genderValues = ['female', 'male', 'custom'] as const;
export type Gender = (typeof genderValues)[number];
export const sexAssignedAtBirthValues = ['female', 'male', 'preferNotToAnswer'] as const;
export type SexAssignedAtBirth = (typeof sexAssignedAtBirthValues)[number];

export type DrivingLicenseOwnership = YesNoDontKnowNonApplicable;

export type TransitPassOwnership = YesNoDontKnowNonApplicable;

export type HasDisability = YesNoDontKnowPreferNotToAnswer;

export type CarsharingMember = YesNoDontKnowNonApplicable;

// Be careful how the question is asked. Used carsharing service in the previous 30 days, previous 6 months?
// This should denote whether a person can use carsharing service/knows how to use it:
export type CarsharingUser = YesNoDontKnowNonApplicable;

export type BikesharingMember = YesNoDontKnowNonApplicable;

// Be careful how the question is asked. Used bikesharing service in the previous 30 days, previous 6 months?
// This should denote whether a person can use bikesharing service/knows how to use it:
export type BikesharingUser = YesNoDontKnowNonApplicable;

export type RidesharingMember = YesNoDontKnowNonApplicable;

// Be careful how the question is asked. Used ridesharing service in the previous 30 days, previous 6 months?
// This should denote whether a person can use ridesharing service/knows how to use it:
export type RidesharingUser = YesNoDontKnowNonApplicable;

// A person can have multiple occupations, like fullTimeStudent + partTimeWorker:
export const occupationValues = [
    'fullTimeWorker', // should be assigned from WorkerType
    'partTimeWorker', // should be assigned from WorkerType
    'fullTimeStudent', // should be assigned from StudentType
    'partTimeStudent', // should be assigned from StudentType
    'workerAndStudent', // deprecated, not precise enough, see below:
    'fullTimeWorkerAndFullTimeStudent', // should be assigned from WorkerType && StudentType
    'fullTimeWorkerAndPartTimeStudent', // should be assigned from WorkerType && StudentType
    'partTimeWorkerAndFullTimeStudent', // should be assigned from WorkerType && StudentType
    'partTimeWorkerAndPartTimeStudent', // should be assigned from WorkerType && StudentType
    'retired',
    'parentalOrSickLeave', // should be assigned from WorkerType, label must be clear
    'atHome',
    'unemployed',
    'other',
    'dontKnow', // not always available
    'nonApplicable', // assign automatically, not shown in choices
    'preferNotToAnswer' // not always available
] as const;
export type Occupation = (typeof occupationValues)[number];

export const schoolTypeValues = [
    'childcare',
    'kindergarten',
    'primarySchool',
    'secondarySchool',
    'kindergartenFor4YearsOld',
    'collegeProfessional', // includes CEGEP, DEP, AEP or other professional diploma
    'university',
    'schoolAtHome',
    'noSchool',
    'other',
    'dontKnow', // not always available
    'nonApplicable', // assign automatically, not shown in choices
    'preferNotToAnswer' // not always available
] as const;
export type SchoolType = (typeof schoolTypeValues)[number];

export const fullTimePartTimeTypeNoValue = ['fullTime', 'partTime', 'no', 'dontKnow', 'nonApplicable'] as const;
export type StudentType = (typeof fullTimePartTimeTypeNoValue)[number];

export const schoolPlaceTypeValues = ['onLocation', 'hybrid', 'remote'] as const;
export type SchoolPlaceType = (typeof schoolPlaceTypeValues)[number];

export type WorkerType = (typeof fullTimePartTimeTypeNoValue)[number] | 'parentalOrSickLeave';

export const workPlaceTypeValues = [
    'onLocation',
    'hybrid',
    'onTheRoadWithUsualPlace',
    'onTheRoadWithoutUsualPlace',
    'remote'
] as const;
export type WorkPlaceType = (typeof workPlaceTypeValues)[number];

export type JobCategory = string | 'dontKnow' | 'nonApplicable'; // TODO: add job categories from official source if possible and document it
export type JobName = string;
export type IsOnTheRoadWorker = YesNoDontKnowNonApplicable;

// Whether the job is compatible with telecommute:
export type HasTelecommuteCompatibleJob = YesNoDontKnowNonApplicable;

// todo: update with more normalized/standardized values
export const educationalAttainmentValues = [
    'noneOrPrimaryEducation',
    'secondaryEducation',
    'postSecondaryNonTertiaryEducation',
    'shortCycleTertiaryEducation',
    'diplomaBelowBachelor',
    'bachelorOrHigher',
    'bachelor', // not always available, can be replaced by bachelorOrHigher
    'master', // not always available, can be replaced by bachelorOrHigher
    'phd', // not always available, can be replaced by bachelorOrHigher
    'dontKnow', // not always available
    'nonApplicable', // assign automatically, not shown in choices
    'preferNotToAnswer' // not always available
] as const;
export type EducationalAttainment = (typeof educationalAttainmentValues)[number];

export const noUsualSchoolPlaceReasonValues = [
    'remoteLearning',
    'internshipWorkStudyApprenticeship',
    'multipleLocationsWithoutMainLocation',
    'other'
] as const;
export type NoUsualSchoolPlaceReason = (typeof noUsualSchoolPlaceReasonValues)[number];

// Weekday schedule type for work/travel days
export type WeekdaySchedule = {
    sunday?: boolean;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
};
