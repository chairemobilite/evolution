/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { Person, ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import projectConfig from '../../config/projectConfig';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

/**
 * Generate persons
 * Populate members for a household from the household's persons attributes
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Household} household - The household to add the members to
 * @param {CorrectedResponse} correctedResponse - corrected response
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populatePersonsForHousehold(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    household: Household,
    correctedResponse: CorrectedResponse,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
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

        // Parse person attributes if parser is available
        if (projectConfig.surveyObjectParsers?.person) {
            projectConfig.surveyObjectParsers.person(personAttributes, correctedResponse);
        }

        const personResult = Person.create(personAttributes as { [key: string]: unknown }, surveyObjectsRegistry);

        if (isOk(personResult)) {
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
