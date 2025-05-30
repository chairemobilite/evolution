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
import { SectionConfig } from '../../types';

export const getSegmentsSectionConfig = (
    // FIXME: There should be an entire configuration object for the segments
    // section, with previous section, next section, parent, etc. or else it
    // should return some other type than the SectionConfig, which will be
    // transformed to a SectionConfig by a higher level handler questionnaire
    // handler
    _options: { context?: (context?: string) => string }
): SectionConfig => {
    const sectionShortname = 'segments';
    return {
        // FIXME Navigation part, should be handled at a higher level
        previousSection: 'visitedPlaces',
        nextSection: 'travelBehavior',

        // FIXME Preload part, which is more a side-effect than a configuration, part of it is navigation, part is side effects
        preload: function (interview, { startUpdateInterview, callback }) {
            const responseContent = {};

            const person = odHelpers.getPerson({ interview });
            const currentJourney = odHelpers.getActiveJourney({ interview, person });
            if (person === null || currentJourney === null) {
                responseContent['response._activeSection'] = 'tripsIntro';
                startUpdateInterview({ sectionShortname: 'tripsIntro', valuesByPath: responseContent }, callback);
                return null;
            }

            let tripsUpdatesValueByPath = {};
            let tripsUpdatesUnsetPaths: string[] = [];
            const tripsPath = `household.persons.${person._uuid}.journeys.${currentJourney._uuid}.trips`;
            const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey: currentJourney });
            const trips = odHelpers.getTripsArray({ journey: currentJourney });

            // Create the missing trips objects and initialize those that may have changed
            for (let tripSequence = 1, count = visitedPlaces.length - 1; tripSequence <= count; tripSequence++) {
                const origin = visitedPlaces[tripSequence - 1];
                const destination = visitedPlaces[tripSequence];
                const trip = trips[tripSequence - 1];
                if (_isBlank(trip)) {
                    // create trip if not exists for this sequence:
                    const addValuesByPath = addGroupedObjects(interview, 1, tripSequence, tripsPath, [
                        {
                            _originVisitedPlaceUuid: origin._uuid,
                            _destinationVisitedPlaceUuid: destination._uuid
                        }
                    ]);
                    tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, addValuesByPath);
                } else if (
                    trip._originVisitedPlaceUuid !== origin._uuid ||
                    trip._destinationVisitedPlaceUuid !== destination._uuid
                ) {
                    // update origin and destination if wrong for this sequence:
                    tripsUpdatesValueByPath[`response.${tripsPath}.${trip._uuid}._originVisitedPlaceUuid`] =
                        origin._uuid;
                    tripsUpdatesValueByPath[`response.${tripsPath}.${trip._uuid}._destinationVisitedPlaceUuid`] =
                        destination._uuid;
                    // also delete existing segments:
                    tripsUpdatesValueByPath[`response.${tripsPath}.${trip._uuid}.segments`] = undefined;
                }
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
                    tripsUpdatesUnsetPaths = tripsUpdatesUnsetPaths.concat(unsetValuePaths);
                    tripsUpdatesValueByPath = Object.assign(tripsUpdatesValueByPath, updateValuePaths);
                }
            }

            if (!_isEmpty(tripsUpdatesValueByPath) || !_isEmpty(tripsUpdatesUnsetPaths)) {
                startUpdateInterview(
                    {
                        sectionShortname,
                        valuesByPath: tripsUpdatesValueByPath,
                        unsetPaths: tripsUpdatesUnsetPaths
                    },
                    (_interview) => {
                        const _currentJourney = odHelpers.getActiveJourney({ interview: _interview });
                        if (_currentJourney === null) {
                            // That would be problematic
                            console.error(
                                'No active journey after updating trips in segments section, but there was an active journey earlier. What happened?'
                            );
                            responseContent['response._activeTripId'] = null;
                            startUpdateInterview({ sectionShortname, valuesByPath: responseContent }, callback);
                            return;
                        }
                        const selectedTrip = odHelpers.selectNextIncompleteTrip({ journey: _currentJourney });
                        responseContent['response._activeTripId'] = selectedTrip !== null ? selectedTrip._uuid : null;
                        // FIXME There was an action generation for the segment section of this person, but the navigator should handle that
                        startUpdateInterview({ sectionShortname, valuesByPath: responseContent }, callback);
                    }
                );
            } else {
                const selectedTrip = odHelpers.selectNextIncompleteTrip({ journey: currentJourney });
                responseContent['response._activeTripId'] = selectedTrip !== null ? selectedTrip._uuid : null;
                // FIXME There was an action generation for the segment section of this person, but the navigator should handle that
                startUpdateInterview({ sectionShortname, valuesByPath: responseContent }, callback);
            }
            return null;
        },

        // Section specific configuration
        template: 'tripsAndSegmentsWithMap',
        title: (t: TFunction) => t(['customSurvey:segments:SegmentsTitle', 'segments:SegmentsTitle']),
        customStyle: {
            // FIXME Why?
            maxWidth: '120rem'
        },
        // FIXME: This should return the widgets and their implementation, not just the names
        widgets: [
            'activePersonTitle',
            'buttonSwitchPerson',
            'personTripsTitle',
            'personTrips',
            'personVisitedPlacesMap',
            'buttonConfirmNextSection'
        ],
        completionConditional: function (interview) {
            // Complete the section if there is no next trip to complete
            const journey = odHelpers.getActiveJourney({ interview });
            const nextTrip = journey !== null ? odHelpers.selectNextIncompleteTrip({ journey }) : null;
            return nextTrip === null;
        }
    };
};
