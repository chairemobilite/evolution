/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _isEmpty from 'lodash/isEmpty';
import { TFunction } from 'i18next';

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { removeGroupedObjects, addGroupedObjects } from '../../../../utils/helpers';
import * as odHelpers from '../../../odSurvey/helpers';
import { SectionConfig, SegmentSectionConfiguration, Trip } from '../../types';

export const getSegmentsSectionConfig = (
    // FIXME: There should be an entire configuration object for the segments
    // section, with previous section, next section, parent, etc. or else it
    // should return some other type than the SectionConfig, which will be
    // transformed to a SectionConfig by a higher level handler questionnaire
    // handler
    options: { context?: (context?: string) => string; segmentConfig?: SegmentSectionConfiguration }
): SectionConfig => {
    return {
        previousSection: 'visitedPlaces',
        nextSection: 'travelBehavior',
        isSectionVisible: (interview, iterationContext) => {
            const personId = iterationContext ? iterationContext[iterationContext.length - 1] : undefined;
            const person = personId === undefined ? null : odHelpers.getPerson({ interview, personId });
            if (person === null) {
                // Log error, that is unexpected
                console.error(
                    `segments section.isSectionVisible: No person found for iteration context: ${JSON.stringify(iterationContext)}`
                );
                return false;
            }
            const currentJourney = odHelpers.getActiveJourney({ interview, person });
            if (currentJourney === null) {
                // Do not display if there is no active journey
                return false;
            }
            return true;
        },
        isSectionCompleted: (interview, iterationContext) => {
            const personId = iterationContext ? iterationContext[iterationContext.length - 1] : undefined;
            const person = personId === undefined ? null : odHelpers.getPerson({ interview, personId });

            if (person === null) {
                // Log error, that is unexpected
                console.error(
                    `segments section.isSectionComplete: No person found for iteration context: ${JSON.stringify(iterationContext)}`
                );
                return false;
            }

            const currentJourney = odHelpers.getActiveJourney({ interview, person });

            // Section is complete if there is no next trip to complete
            const nextTrip: Trip | null = odHelpers.selectNextIncompleteTrip({ journey: currentJourney! });
            return nextTrip === null;
        },
        onSectionEntry: function (interview, iterationContext) {
            const personId = iterationContext ? iterationContext[iterationContext.length - 1] : undefined;
            const person = personId === undefined ? null : odHelpers.getPerson({ interview, personId });
            if (person === null) {
                // Log error, that is unexpected
                console.error(
                    `segments section.onSectionEntry: No person found for iteration context: ${JSON.stringify(iterationContext)}`
                );
                return undefined;
            }
            const responseContent = {};

            const currentJourney = odHelpers.getActiveJourney({ interview, person });

            const tripsPath = `household.persons.${person._uuid}.journeys.${currentJourney!._uuid}.trips`;
            const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey: currentJourney! });
            const trips = odHelpers.getTripsArray({ journey: currentJourney! });
            const nextTrip: Trip | null = odHelpers.selectNextIncompleteTrip({ journey: currentJourney! });
            let firstInvalidTripId: string | null | undefined = nextTrip ? nextTrip._uuid : null;
            let foundFirstInvalidTrip = false;

            // Create the missing trips objects and initialize those that may have changed
            const newTrips: { _originVisitedPlaceUuid: string; _destinationVisitedPlaceUuid: string }[] = [];
            for (let tripSequence = 1, count = visitedPlaces.length - 1; tripSequence <= count; tripSequence++) {
                const origin = visitedPlaces[tripSequence - 1];
                const destination = visitedPlaces[tripSequence];
                const trip = trips[tripSequence - 1];
                if (_isBlank(trip)) {
                    // create trip if not exists for this sequence:
                    newTrips.push({
                        _originVisitedPlaceUuid: origin._uuid,
                        _destinationVisitedPlaceUuid: destination._uuid
                    });
                } else if (
                    trip._originVisitedPlaceUuid !== origin._uuid ||
                    trip._destinationVisitedPlaceUuid !== destination._uuid
                ) {
                    // update origin and destination if wrong for this sequence:
                    responseContent[`response.${tripsPath}.${trip._uuid}._originVisitedPlaceUuid`] = origin._uuid;
                    responseContent[`response.${tripsPath}.${trip._uuid}._destinationVisitedPlaceUuid`] =
                        destination._uuid;
                    // also delete existing segments:
                    responseContent[`response.${tripsPath}.${trip._uuid}.segments`] = undefined;
                    if (firstInvalidTripId === null || !foundFirstInvalidTrip) {
                        // If the first invalid trip is not set, set it to this trip
                        firstInvalidTripId = trip._uuid;
                        foundFirstInvalidTrip = true;
                    }
                } else if (!foundFirstInvalidTrip && trip._uuid === firstInvalidTripId) {
                    // If this is the first invalid trip, we found it
                    foundFirstInvalidTrip = true;
                }
            }
            // If the invalid trip was not found, it is not in the trips array anymore, so we set it to null
            if (!foundFirstInvalidTrip && nextTrip !== null) {
                firstInvalidTripId = null;
            }
            if (newTrips.length > 0) {
                // Add the new trips all at once, after the existing ones
                const addValuesByPath = addGroupedObjects(
                    interview,
                    newTrips.length,
                    trips.length + 1,
                    tripsPath,
                    newTrips
                );
                // Set the first invalid trip to the first trip in the new sequence
                if (firstInvalidTripId === null) {
                    // Find trip with lowest sequence number
                    const newTripKey = Object.keys(addValuesByPath)
                        .filter((key) => key.startsWith(`response.${tripsPath}`))
                        .sort(
                            (tripKeyA, tripKeyB) =>
                                (addValuesByPath[tripKeyA] as any)._sequence -
                                (addValuesByPath[tripKeyB] as any)._sequence
                        )[0];
                    // From the newJourneyKey, get the journey UUID as the rest of the string after the last dot
                    const tripUuid = newTripKey!.split('.').pop();
                    firstInvalidTripId = tripUuid;
                }
                Object.assign(responseContent, addValuesByPath);
            }

            // remove superfluous trips, there should be one less than visited places
            // FIXME Should we handle the case of the loop activities here?
            if (trips.length >= visitedPlaces.length) {
                const tripsPathsToRemove: string[] = [];
                for (
                    let tripSequence = visitedPlaces.length, count = trips.length;
                    tripSequence <= count;
                    tripSequence++
                ) {
                    const trip = trips[tripSequence - 1];
                    tripsPathsToRemove.push(`${tripsPath}.${trip._uuid}`);
                }
                if (tripsPathsToRemove.length > 0) {
                    const [updateValuePaths, unsetValuePaths] = removeGroupedObjects(interview, tripsPathsToRemove);
                    Object.assign(responseContent, updateValuePaths);
                    for (const path of unsetValuePaths) {
                        responseContent[path] = undefined;
                    }
                }
            }

            if (!_isEmpty(responseContent)) {
                return {
                    ...responseContent,
                    'response._activeTripId': firstInvalidTripId
                };
            } else {
                responseContent['response._activeTripId'] = nextTrip !== null ? nextTrip._uuid : null;
                return responseContent;
            }
        },

        // Section specific configuration
        template: 'tripsAndSegmentsWithMap',
        title: (t: TFunction) => t(['customSurvey:segments:SegmentsTitle', 'segments:SegmentsTitle']),
        customStyle: {
            // FIXME Why?
            maxWidth: '120rem'
        },
        // FIXME: This should return the widgets and their implementation, not just the names
        widgets: options.segmentConfig?.enabled
            ? [
                'activePersonTitle',
                'buttonSwitchPerson',
                'personTripsTitle',
                'personTrips',
                'personVisitedPlacesMap',
                'buttonConfirmNextSection'
            ]
            : []
    };
};
