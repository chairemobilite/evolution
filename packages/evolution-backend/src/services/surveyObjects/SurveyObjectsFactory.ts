/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { create as createInterviewObject } from 'evolution-common/lib/services/baseObjects/interview/InterviewUnserializer';
import { isOk } from 'evolution-common/lib/types/Result.type';
import { SurveyObjectsWithErrors } from 'evolution-common/lib/services/baseObjects/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { populatePersonsForHousehold } from './PersonFactory';
import { populateJourneysForPerson } from './JourneyFactory';
import { ExtendedPersonAttributes } from 'evolution-common/lib/services/baseObjects/Person';
import projectConfig from '../../config/projectConfig';
import { Home } from 'evolution-common/lib/services/baseObjects/Home';
import { ExtendedHouseholdAttributes, Household } from 'evolution-common/lib/services/baseObjects/Household';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';

/**
 * Configuration options for object creation
 */
export type SurveyObjectsFactoryOptions = {
    /** Whether to calculate routing (walking/cycling/driving-freeflow/transit) or not */
    calculateRouting?: boolean;
    /** Whether to force update routing even if already calculated */
    forceUpdateRouting?: boolean;
    /** Custom audit functions for survey-specific logic */
    //customAudits?: SurveyAudits; // TODO: allow survey specific audit functions
};

/**
 * Generic survey object factory that can be extended for specific surveys
 */
export class SurveyObjectsFactory {
    private options: SurveyObjectsFactoryOptions;

    /**
     * Creates a new SurveyObjectsFactory instance
     * @param {ObjectGenerationOptions} options - Configuration options for object creation
     */
    constructor(options: SurveyObjectsFactoryOptions = {}) {
        this.options = {
            calculateRouting: true,
            forceUpdateRouting: false,
            ...options
        };
    }

    /**
     * Main method to create objects and prepare for audits
     * Orchestrates the entire object creation for a single interview
     *
     * If a survey objects has any error, it will be set as undefined in the surveyObjectsWithErrors
     * and the errors will be included in the errorsByObject.
     *
     * This function also runs the parsers found in the survey project and setup in project config.
     *
     * @param {SurveyObjectsWithErrors} surveyObjectsWithErrors - Container for created objects with errors
     * @param {InterviewAttributes} interviewAttributes - The interview attributes
     * @returns {Promise<void>}
     * @private
     */
    async createAllObjectsWithErrors(interviewAttributes: InterviewAttributes): Promise<SurveyObjectsWithErrors> {
        const surveyObjectsWithErrors: SurveyObjectsWithErrors = {
            interview: undefined,
            household: undefined,
            home: undefined,
            errorsByObject: {
                interview: [],
                interviewUuid: interviewAttributes.uuid,
                home: [],
                homeUuid: interviewAttributes.uuid,
                household: [],
                householdUuid: interviewAttributes.uuid,
                personsByUuid: {},
                journeysByUuid: {},
                visitedPlacesByUuid: {},
                tripsByUuid: {},
                segmentsByUuid: {}
            }
        };

        if (!interviewAttributes.corrected_response) {
            surveyObjectsWithErrors.errorsByObject.interview = [
                new Error(
                    'Interview validateParams: Corrected response is missing from interview attributes. It must be generated from original responses on first review.'
                )
            ];
            return surveyObjectsWithErrors;
        }

        // reset SurveyObjectsRegistry (otherwise the registry will fill out with previous interview objects)
        const surveyObjectsRegistry = new SurveyObjectsRegistry();

        // Create Interview
        const correctedResponse = projectConfig.surveyObjectParsers?.interview
            ? projectConfig.surveyObjectParsers.interview(interviewAttributes.corrected_response)
            : interviewAttributes.corrected_response;

        const interviewResult = createInterviewObject(
            _omit(correctedResponse, ['home', 'household']) as CorrectedResponse,
            interviewAttributes,
            surveyObjectsRegistry
        );
        if (isOk(interviewResult)) {
            surveyObjectsWithErrors.interview = interviewResult.result;
        } else {
            surveyObjectsWithErrors.errorsByObject.interview = interviewResult.errors;
            console.log(
                `==== Interview creation failed with errors count: ${interviewResult.errors?.length || 0} ====`
            );
        }

        const homeAttributes = projectConfig.surveyObjectParsers?.home
            ? projectConfig.surveyObjectParsers.home(
                  correctedResponse.home as ExtendedPlaceAttributes,
                  correctedResponse
            )
            : correctedResponse.home;

        // Only try to create home if we have home attributes
        if (homeAttributes) {
            const homeResult = Home.create(homeAttributes as { [key: string]: unknown }, surveyObjectsRegistry);
            if (isOk(homeResult)) {
                surveyObjectsWithErrors.home = homeResult.result;
            } else {
                surveyObjectsWithErrors.errorsByObject.home = homeResult.errors;
                console.log(`  ==== Home creation failed with errors count: ${homeResult.errors?.length || 0} ====`);
            }
        } else {
            console.log('  ==== Home creation skipped (no home attributes) ====');
        }

        const householdAttributes = projectConfig.surveyObjectParsers?.household
            ? projectConfig.surveyObjectParsers.household(
                  correctedResponse.household as ExtendedHouseholdAttributes,
                  correctedResponse
            )
            : correctedResponse.household;

        // Only try to create household if we have household attributes
        if (householdAttributes) {
            const householdResult = Household.create(
                _omit(householdAttributes, ['persons']) as { [key: string]: unknown },
                surveyObjectsRegistry
            );
            if (isOk(householdResult)) {
                surveyObjectsWithErrors.household = householdResult.result;
            } else {
                surveyObjectsWithErrors.errorsByObject.household = householdResult.errors;
                console.log(
                    `  ==== Household creation failed with errors count: ${householdResult.errors?.length || 0} ====`
                );
            }
        } else {
            console.log('  ==== Household creation skipped (no household attributes) ====');
        }

        const home = surveyObjectsWithErrors.home;
        const household = surveyObjectsWithErrors.household;

        // Continue with persons, journeys, etc. if household and home were created
        if (household && householdAttributes) {
            // For now, we'll keep the existing factory functions for persons/journeys
            // These can be refactored later in the same way
            await populatePersonsForHousehold(
                surveyObjectsWithErrors,
                household,
                correctedResponse,
                surveyObjectsRegistry
            );

            const personsAttributes = householdAttributes.persons || {};
            const persons = household.members || [];

            // Loop through each person
            for (let i = 0, count = persons.length; i < count; i++) {
                const person = persons[i];
                const personUuid = person._uuid!;
                const personAttributes = personsAttributes[personUuid] as ExtendedPersonAttributes;

                // Generate all journeys for this person (includes visited places, trips, and segments)
                await populateJourneysForPerson(
                    surveyObjectsWithErrors,
                    person,
                    personAttributes,
                    home,
                    correctedResponse,
                    surveyObjectsRegistry
                );

                // Setup work and school places after all visited places are created
                person.setupWorkAndSchoolPlaces();
            }
        }

        return surveyObjectsWithErrors;
    }
}
