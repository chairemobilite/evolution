/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { Household } from 'evolution-common/lib/services/baseObjects/Household';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { Optional } from 'evolution-common/lib/types/Optional.type';
import projectConfig from '../../config/projectConfig';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import { compareSequenceThenUuid } from 'evolution-common/lib/services/baseObjects/sequenceUtils';
import { populateJourneysForPerson } from './JourneyFactory';
import { AuditLog } from '../audits/auditLog';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';

/**
 * Generate persons
 * Populate members for a household from the household's persons attributes
 * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
 * @param {Household} household - The household to add the members to
 * @param {Home} home - The home object for geography assignment, needed by nested journeys
 * @param {CorrectedResponse} correctedResponse - corrected response
 * @param {SurveyObjectsRegistry} surveyObjectsRegistry - SurveyObjectsRegistry
 * @returns {Promise<void>}
 */
export async function populatePersonsForHousehold(
    surveyObjectsWithErrors: SurveyObjectsWithErrors,
    household: Household,
    home: Optional<Home>,
    correctedResponse: CorrectedResponse,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Promise<void> {
    const householdAttributes = correctedResponse.household || {};

    // If no household, return
    if (!surveyObjectsWithErrors.household) {
        AuditLog.debug('No household - skipping persons creation');
        return;
    }

    household.members = [];

    const personsAttributes = householdAttributes.persons || {};

    // Sort persons by _sequence before processing
    const sortedPersonEntries = Object.entries(personsAttributes).sort(compareSequenceThenUuid);

    // Track person index for color assignment
    let personIndex = 0;

    for (const [personUuid, originalCorrectedPersonAttributes] of sortedPersonEntries) {
        if (personUuid === 'undefined') {
            continue; // ignore if uuid is undefined
        }

        const personAttributes = projectConfig.surveyObjectParsers?.person
            ? projectConfig.surveyObjectParsers.person(originalCorrectedPersonAttributes, correctedResponse)
            : originalCorrectedPersonAttributes;

        // Omit journeys as they will be populated separately in the next step (populateJourneysForPerson)
        const personResult = Person.create(
            _omit(personAttributes as { [key: string]: unknown }, ['journeys']) as ExtendedPersonAttributes,
            surveyObjectsRegistry
        );

        if (isOk(personResult)) {
            // Assign color to person
            personResult.result.assignColor(personIndex);
            household.members.push(personResult.result);
            personIndex++;

            // Create journeys for this person (includes visited places, trips, and segments)
            await populateJourneysForPerson(
                surveyObjectsWithErrors,
                personResult.result,
                personAttributes as ExtendedPersonAttributes,
                home,
                correctedResponse,
                surveyObjectsRegistry
            );

            // Setup work and school places after all visited places are created
            personResult.result.setupWorkAndSchoolPlaces();
        } else {
            AuditLog.debug(
                `Person ${personUuid} creation failed with errors count: ${personResult.errors?.length || 0}`
            );
            surveyObjectsWithErrors.errorsByObject.personsByUuid[personUuid] = personResult.errors;
        }
    }
}
