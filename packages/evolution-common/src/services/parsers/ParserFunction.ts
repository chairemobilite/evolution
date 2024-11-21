/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserInterviewAttributes, InterviewResponses, Household, Person } from '../questionnaire/types';

/**
 * Parser function to change/manipulate/enhance values for export.
 * Associated with a specific path.
 * TODO: update this parser made for legacy purpose, one step at a time,
 * using new classes for person, household, etc. and after validations
 * cleaning.
 */
export type ParserFunction = (
    interview: UserInterviewAttributes,
    responses: InterviewResponses & { [key: string]: any },
    household: Household,
    home: {
        region?: string;
        country?: string;
    },
    personsById: { [key: string]: Person }, // kept for backward compatibility, will be replaced by object types
    personsArray: Person[], // kept for backward compatibility, one of the two will be removed
    person: Person
) => any; // returns the new value after parsing
