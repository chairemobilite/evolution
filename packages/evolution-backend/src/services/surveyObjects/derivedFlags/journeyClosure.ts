/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import {
    compareSequenceThenUuid,
    type SequencedAttributes
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';

const JOURNEY_CLOSED_CATEGORY = 'stayedThereUntilTheNextDay';

export type VisitedPlaceJourneyClosureAttributes = SequencedAttributes & {
    nextPlaceCategory?: string;
};

const getSortedVisitedPlaces = (
    visitedPlacesByUuid?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes } | null
): VisitedPlaceJourneyClosureAttributes[] => {
    return Object.entries(visitedPlacesByUuid ?? {})
        .filter(([, visitedPlace]) => !_isBlank(visitedPlace))
        .sort(compareSequenceThenUuid)
        .map(([, visitedPlace]) => visitedPlace);
};

/**
 * Whether the last questionnaire visited place closed the journey.
 *
 * Closed means the last place (by `_sequence`) answers
 * `nextPlaceCategory === 'stayedThereUntilTheNextDay'`. A missing answer is
 * treated as not closed: when the trip diary is enabled, every place is
 * expected to answer.
 *
 * TODO: once questionnaireConfig is easy to read on the server, skip this
 * when the trip diary is not enabled for the survey.
 *
 * @param visitedPlacesByUuid - Questionnaire visited places keyed by uuid
 * @returns `true` when the last place closes the journey, otherwise `false`
 */
export const computeIsJourneyClosed = (
    visitedPlacesByUuid?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes } | null
): boolean => {
    const visitedPlaces = getSortedVisitedPlaces(visitedPlacesByUuid);
    if (visitedPlaces.length === 0) {
        return false;
    }
    return visitedPlaces[visitedPlaces.length - 1].nextPlaceCategory === JOURNEY_CLOSED_CATEGORY;
};

/**
 * Whether more than one questionnaire visited place closed the journey.
 *
 * A close is `nextPlaceCategory === 'stayedThereUntilTheNextDay'`.
 *
 * @param visitedPlacesByUuid - Questionnaire visited places keyed by uuid
 * @returns `true` when more than one place closes the journey
 */
export const computeIsJourneyClosedMoreThanOnce = (
    visitedPlacesByUuid?: { [uuid: string]: VisitedPlaceJourneyClosureAttributes } | null
): boolean => {
    const visitedPlaces = getSortedVisitedPlaces(visitedPlacesByUuid);
    return (
        visitedPlaces.filter((visitedPlace) => visitedPlace.nextPlaceCategory === JOURNEY_CLOSED_CATEGORY).length > 1
    );
};
