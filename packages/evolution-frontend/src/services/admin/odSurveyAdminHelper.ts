/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/** TODO This file's functions should be dropped in favor of using the
 * de-serialized interview object, when the admin's Interview objects are ready
 * to be used with sufficient defaults in evolution */
import _get from 'lodash/get';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { pointsToBezierCurve } from 'evolution-common/lib/services/geodata/SurveyGeographyUtils';

export const generateMapFeatureFromInterview = (
    interview: InterviewAttributes,
    { activePlacePath, activeTripUuid }: { activePlacePath?: string; activeTripUuid?: string }
): {
    placesCollection: GeoJSON.FeatureCollection<GeoJSON.Point>;
    tripsCollection: GeoJSON.FeatureCollection<GeoJSON.LineString>;
    pathToUniqueKeyMap: Map<string, string>;
} => {
    const placesCollection = {
        type: 'FeatureCollection' as const,
        features: []
    } as GeoJSON.FeatureCollection<GeoJSON.Point>;
    const tripsCollection = {
        type: 'FeatureCollection' as const,
        features: []
    } as GeoJSON.FeatureCollection<GeoJSON.LineString>;

    const response = interview.response;
    const persons = odSurveyHelper.getPersonsArray({ interview });

    const roundedCoordinatesPairsCount = {};
    const coordinatesByVisitedPlaceUuid = {};

    // Map to track unique places by activity and coordinates
    const uniquePlacesMap = new Map<
        string,
        {
            place: any;
            paths: string[];
            isAnyActive: boolean;
        }
    >();

    // Map from original path to unique key for selection mapping
    const pathToUniqueKeyMap = new Map<string, string>();

    // Add the visited places and trips to the places and trips collections for each person
    for (const person of persons) {
        const personColor = (person as any)._color || '#000000';
        const personPath = `response.household.persons.${person._uuid}`;
        const journeys = odSurveyHelper.getJourneysArray({ person });
        for (const journey of journeys) {
            const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
            const trips = odSurveyHelper.getTripsArray({ journey });

            // Add the visited places to the places collection
            for (const visitedPlace of visitedPlaces) {
                const visitedPlacePath = `${personPath}.journeys.${journey._uuid}.visitedPlaces.${visitedPlace._uuid}`;
                const geography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, interview, person });

                if (geography) {
                    const coordinates = _get(geography, 'geometry.coordinates', null);
                    coordinatesByVisitedPlaceUuid[visitedPlace._uuid] = coordinates;

                    const isActive = visitedPlacePath === activePlacePath;

                    // Create unique key based on activity and rounded coordinates
                    if (!coordinates) continue; // Skip if no coordinates
                    const roundedLng = Math.round(coordinates[0] * 100000) / 100000;
                    const roundedLat = Math.round(coordinates[1] * 100000) / 100000;
                    const uniqueKey = `${visitedPlace.activity}_${roundedLng}_${roundedLat}`;

                    // Map this path to the unique key
                    pathToUniqueKeyMap.set(visitedPlacePath, uniqueKey);

                    if (uniquePlacesMap.has(uniqueKey)) {
                        // Add path to existing entry and update active state
                        const existingEntry = uniquePlacesMap.get(uniqueKey)!;
                        existingEntry.paths.push(visitedPlacePath);
                        existingEntry.isAnyActive = existingEntry.isAnyActive || isActive;
                    } else {
                        // Create new entry
                        const place = {
                            type: 'Feature' as const,
                            geometry: geography.geometry,
                            properties: {
                                path: visitedPlacePath, // Use visited place path, not coordinates path
                                activity: visitedPlace.activity,
                                lastAction: _get(visitedPlace, 'geography.properties.lastAction', '?'),
                                active: isActive,
                                name: visitedPlace.name,
                                personUuid: person._uuid,
                                visitedPlaceUuid: visitedPlace._uuid
                            }
                        };

                        uniquePlacesMap.set(uniqueKey, {
                            place,
                            paths: [visitedPlacePath],
                            isAnyActive: isActive
                        });
                    }
                }
            }

            // Add the trips to the trips collection for this person
            for (const trip of trips) {
                const originPlaceUuid = trip._originVisitedPlaceUuid;
                const destinationPlaceUuid = trip._destinationVisitedPlaceUuid;
                if (!originPlaceUuid || !destinationPlaceUuid) {
                    continue;
                }
                const originCoordinates = coordinatesByVisitedPlaceUuid[originPlaceUuid];
                const destinationCoordinates = coordinatesByVisitedPlaceUuid[destinationPlaceUuid];
                // TODO Handle junction geographies here
                if (originCoordinates && destinationCoordinates) {
                    const roundedCoordinatesPair =
                        (Math.round(originCoordinates[0] * 1000) / 1000).toString() +
                        ',' +
                        (Math.round(destinationCoordinates[0] * 1000) / 1000).toString();
                    if (!roundedCoordinatesPairsCount[roundedCoordinatesPair]) {
                        roundedCoordinatesPairsCount[roundedCoordinatesPair] = 1;
                    } else {
                        roundedCoordinatesPairsCount[roundedCoordinatesPair]++;
                    }

                    const superposedSequence = roundedCoordinatesPairsCount[roundedCoordinatesPair];

                    const tripCurve = pointsToBezierCurve(
                        [
                            { type: 'Point', coordinates: originCoordinates },
                            { type: 'Point', coordinates: destinationCoordinates }
                        ],
                        {
                            superposedSequence,
                            additionalProperties: {
                                personUuid: person._uuid,
                                tripUuid: trip._uuid,
                                active: activeTripUuid === trip._uuid,
                                color: personColor
                            }
                        }
                    );

                    tripsCollection.features.push(tripCurve);
                }
            }
        }
    }

    // Add the main home geography (will be deduplicated if there are home visited places)
    const homeGeography = response.home?.geography ? response.home.geography : null;
    if (homeGeography) {
        const homePath = 'response.home';
        const isHomeActive = homePath === activePlacePath;

        // Create unique key for home place
        const coordinates = homeGeography.geometry.coordinates;
        const roundedLng = Math.round(coordinates[0] * 100000) / 100000;
        const roundedLat = Math.round(coordinates[1] * 100000) / 100000;
        const uniqueKey = `home_${roundedLng}_${roundedLat}`;

        // Map this path to the unique key
        pathToUniqueKeyMap.set(homePath, uniqueKey);

        if (uniquePlacesMap.has(uniqueKey)) {
            // Add path to existing entry and update active state
            const existingEntry = uniquePlacesMap.get(uniqueKey)!;
            existingEntry.paths.push(homePath);
            existingEntry.isAnyActive = existingEntry.isAnyActive || isHomeActive;
        } else {
            // Create new entry
            const place = {
                type: 'Feature' as const,
                geometry: homeGeography.geometry,
                properties: {
                    path: homePath,
                    activity: 'home',
                    active: isHomeActive
                }
            };

            uniquePlacesMap.set(uniqueKey, {
                place,
                paths: [homePath],
                isAnyActive: isHomeActive
            });
        }
    }

    // Add deduplicated places to the collection
    for (const [, entry] of uniquePlacesMap) {
        // Update the active state based on whether any duplicate is active
        entry.place.properties.active = entry.isAnyActive;
        placesCollection.features.push(entry.place);
    }

    return { placesCollection, tripsCollection, pathToUniqueKeyMap };
};
