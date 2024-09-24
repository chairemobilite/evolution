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
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import * as odSurveyHelper from 'evolution-common/lib/services/odSurvey/helpers';
import { pointsToBezierCurve } from '../geodata/SurveyGeographyUtils';

export const generateMapFeatureFromInterview = (
    interview: InterviewAttributes,
    { activePlacePath, activeTripUuid }: { activePlacePath?: string; activeTripUuid?: string }
): {
    placesCollection: GeoJSON.FeatureCollection<GeoJSON.Point>;
    tripsCollection: GeoJSON.FeatureCollection<GeoJSON.LineString>;
} => {
    const placesCollection = {
        type: 'FeatureCollection' as const,
        features: []
    } as GeoJSON.FeatureCollection<GeoJSON.Point>;
    const tripsCollection = {
        type: 'FeatureCollection' as const,
        features: []
    } as GeoJSON.FeatureCollection<GeoJSON.LineString>;

    const responses = interview.responses;
    const persons = odSurveyHelper.getPersonsArray({ interview });

    const roundedCoordinatesPairsCount = {};
    const coordinatesByVisitedPlaceUuid = {};
    // Add the home geography to the places
    const homeGeography = responses.home?.geography ? responses.home.geography : null;
    if (homeGeography) {
        const path = 'responses.home.geography.geometry.coordinates';
        const place = {
            type: 'Feature' as const,
            geometry: homeGeography.geometry,
            properties: {
                path: path,
                activity: 'home',
                active: (path === activePlacePath).toString()
            }
        };
        placesCollection.features.push(place);
    }

    // Add the visited places and trips to the places and trips collections for each person
    for (const person of persons) {
        const personColor = (person as any)._color || '#000000';
        const personPath = `responses.household.persons.${person._uuid}`;
        const journeys = odSurveyHelper.getJourneysArray({ person });
        for (const journey of journeys) {
            const visitedPlaces = odSurveyHelper.getVisitedPlacesArray({ journey });
            const trips = odSurveyHelper.getTripsArray({ journey });

            // Add the visited places to the places collection
            for (const visitedPlace of visitedPlaces) {
                const visitedPlacePath = `${personPath}.visitedPlaces.${visitedPlace._uuid}`;
                const geography = odSurveyHelper.getVisitedPlaceGeography({ visitedPlace, interview, person });

                if (geography) {
                    const coordinates = _get(geography, 'geometry.coordinates', null);
                    const path = `${visitedPlacePath}.geography.geometry.coordinates`;
                    coordinatesByVisitedPlaceUuid[visitedPlace._uuid] = coordinates;

                    // Do not re-add home location
                    if (visitedPlace.activity !== 'home') {
                        const place = {
                            type: 'Feature' as const,
                            geometry: geography.geometry,
                            properties: {
                                path,
                                activity: visitedPlace.activity,
                                lastAction: _get(visitedPlace, 'geography.properties.lastAction', '?'),
                                active: (path === activePlacePath).toString(),
                                name: visitedPlace.name,
                                personUuid: person._uuid,
                                visitedPlaceUuid: visitedPlace._uuid
                            }
                        };
                        placesCollection.features.push(place);
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

                    // FIXME Add some more trip properties
                    /*tripCurve.properties = {
                        birdDistance: distance,
                        startAt: secondsSinceMidnightToTimeStr(surveyProjectHelper.getStartAt(trip, visitedPlaces)),
                        endAt: secondsSinceMidnightToTimeStr(surveyProjectHelper.getEndAt(trip, visitedPlaces)),
                        durationSec: duration,
                        durationMin: duration / 60,
                        birdSpeedMps: birdSpeedMps,
                        birdSpeedKmh: birdSpeedMps * 3.6,
                        modes: Object.values(trip && trip.segments ? trip.segments : {}).map(function (segment) {
                            return segment.mode;
                        }),
                        segmentUuids: Object.keys(trip && trip.segments ? trip.segments : {}),
                        sequence: trip._sequence,
                        bearing,
                    };*/
                    tripsCollection.features.push(tripCurve);
                }
            }
        }
    }

    return { placesCollection, tripsCollection };
};
