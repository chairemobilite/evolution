/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserInterviewAttributes, InterviewResponses, Household, Person } from '../interviews/interview';

/**
 * Parser function to change/manipulate/enhance values for export.
 * Associated with a specific path.
 * TODO: update this parser made for legacy purpose, one step at a time,
 * using new classes for person, household, etc. and after validations
 * cleaning.
 */
export type ParserFunction<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> = (
    interview: UserInterviewAttributes<CustomSurvey, CustomHousehold, CustomHome, CustomPerson>,
    responses: InterviewResponses<CustomSurvey, CustomHousehold, CustomHome, CustomPerson> & { [key: string]: any },
    household: Household<CustomHousehold, CustomPerson>,
    home: {
        region?: string;
        country?: string;
    } & CustomHome,
    personsById: { [key: string]: Person<CustomPerson> }, // kept for backward compatibility, will be replaced by object types
    personsArray: Person<CustomPerson>[], // kept for backward compatibility, one of the two will be removed
    person: Person<CustomPerson>
) => any; // returns the new value after parsing
