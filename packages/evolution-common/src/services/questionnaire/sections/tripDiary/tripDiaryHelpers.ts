/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as odHelpers from '../../../odSurvey/helpers';
import type { SectionConfig } from '../../types';

export const tripDiarySectionVisibleConditional: Exclude<SectionConfig['isSectionVisible'], undefined> = (
    interview,
    iterationContext
) => {
    const personId = iterationContext ? iterationContext[iterationContext.length - 1] : undefined;
    const person = personId === undefined ? null : odHelpers.getPerson({ interview, personId });
    if (person === null) {
        // Log error, that is unexpected
        console.error(
            `trip diary section.isSectionVisible: No person found for iteration context: ${JSON.stringify(iterationContext)}`
        );
        return false;
    }
    const currentJourney = odHelpers.getActiveJourney({ interview, person });
    if (currentJourney === null) {
        // Do not display if there is no active journey
        return false;
    }
    return odHelpers.shouldShowTripsAndPlacesSections({ journey: currentJourney });
};
