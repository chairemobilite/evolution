/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { InterviewAttributes, CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { Person, ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import projectConfig from '../../config/projectConfig';

/**
 * Generate persons
 * Processes all persons in the household, creating Person objects and associating them with the household
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {InterviewAttributes} interviewAttributes - The interview attributes
 * @param {Household} household - The household to add the persons to
 * @returns {Promise<void>}
 */
export async function createPersonsForHousehold(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    household: Household,
    interviewAttributes: InterviewAttributes
): Promise<void> {
    const correctedResponse: CorrectedResponse = interviewAttributes.corrected_response || {};
    const householdAttributes = correctedResponse.household || {};

    // If no household, return
    if (!surveyObjectsWithErrors.household) {
        console.log('    ==== No household - skipping persons creation ====');
        return;
    }

    household.members = [];

    const personsAttributes = householdAttributes.persons || {};

    // Sort persons by _sequence before processing
    const sortedPersonEntries = Object.entries(personsAttributes).sort(([, a], [, b]) => {
        const sequenceA = (a as unknown as ExtendedPersonAttributes)?._sequence || 0;
        const sequenceB = (b as unknown as ExtendedPersonAttributes)?._sequence || 0;
        return sequenceA - sequenceB;
    });

    // Track person index for color assignment
    let personIndex = 0;

    for (const [personUuid, personAttributes] of sortedPersonEntries) {
        if (personUuid === 'undefined') {
            continue; // ignore if uuid is undefined
        }

        console.log(`      ==== Person ${personUuid} creation ====`);

        // Parse person attributes if parser is available
        if (projectConfig.surveyObjectParsers?.person) {
            projectConfig.surveyObjectParsers.person(personAttributes, interviewAttributes);
        }

        const personResult = Person.create(personAttributes as { [key: string]: unknown });

        if (isOk(personResult)) {
            console.log(`      ==== Person ${personUuid} created successfully ====`);
            // Assign color to person
            personResult.result.assignColor(personIndex);
            household.members.push(personResult.result);
            personIndex++;
        } else {
            console.log(
                `      ==== Person ${personUuid} creation failed with errors count: ${personResult.errors?.length || 0} ====`
            );
            surveyObjectsWithErrors.errorsByObject.personsByUuid[personUuid] = personResult.errors;
        }
    }
}
