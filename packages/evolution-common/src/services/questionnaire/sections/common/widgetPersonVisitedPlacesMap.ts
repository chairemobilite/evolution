/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InfoMapWidgetConfig, SurveyMapObjectProperty } from '../../../questionnaire/types';

import * as odHelpers from '../../../odSurvey/helpers';
import { TFunction } from 'i18next';
import projectConfig from '../../../../config/project.config';
import { pointsToBezierCurve } from '../../../geodata/SurveyGeographyUtils';
import { UserInterviewAttributes } from '../../types';
import { getActivityMarkerIcon } from '../visitedPlaces/activityIconMapping';

export const getPersonVisitedPlacesMapConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    // FIXME: Add a common type for the getFormattedDate function if we keep it as option here (the actual implementation is frontend-only as it requires i18n locale)
    options: { context?: (context?: string) => string; getFormattedDate: (date: string) => string }
): InfoMapWidgetConfig => {
    const getContext = options.context || ((str) => str);
    return {
        type: 'infoMap',
        path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlacesMap',
        defaultCenter: projectConfig.mapDefaultCenter,
        title: (t: TFunction, interview: UserInterviewAttributes) => {
            // FIXME This differs from the widgetPersonTripsTitle text only in
            // the translated string array. We could add a helper to get a
            // dated/nicknamed string of the current journey
            const person = odHelpers.getActivePerson({ interview });
            const journey = odHelpers.getActiveJourney({ interview });
            // FIXME Write a function somewhere to get the journey's or dateToString function, once we move to objects
            // FIXME2 Plan for a translation string that has a period (undated, dated, period)
            const journeyDates = journey && journey.startDate ? options.getFormattedDate(journey.startDate) : null;
            return t(['customSurvey:survey:TripsMap', 'survey:TripsMap'], {
                context: getContext(journeyDates === null ? 'undated' : undefined),
                nickname: person !== null && person.nickname ? person.nickname : '',
                journeyDates,
                count: person === null ? 1 : odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        },
        linestringColor: '#0000ff',
        geojsons: (interview) => {
            // FIXME This has a lot in common with
            // `generateMapFeatureFromInterview` from the odSurveyAdminHelper.ts
            // file, which displays the visited places and trips for all persons
            // in the household. Probably parts of these function can be
            // extracted and re-used here, once there is more stability and we
            // know exactly what to display
            const person = odHelpers.getActivePerson({ interview });
            const journey = odHelpers.getActiveJourney({ interview });
            if (journey === null || person === null) {
                return {
                    points: {
                        type: 'FeatureCollection',
                        features: []
                    },
                    linestrings: {
                        type: 'FeatureCollection',
                        features: []
                    }
                };
            }
            const visitedPlaces = odHelpers.getVisitedPlacesArray({ journey });

            const tripsGeojsonFeatures: GeoJSON.Feature<GeoJSON.LineString, SurveyMapObjectProperty>[] = [];
            const visitedPlacesGeojsonFeatures: GeoJSON.Feature<GeoJSON.Point, SurveyMapObjectProperty>[] = [];

            // FIXME In the original code, there was something for the selected
            // trip ID, but there is in theory no active trip when the map is
            // displayed. Or should there be?
            for (let i = 0, count = visitedPlaces.length; i < count; i++) {
                const visitedPlace = visitedPlaces[i];
                const visitedPlaceGeography = odHelpers.getVisitedPlaceGeography({ visitedPlace, interview, person });
                if (visitedPlaceGeography) {
                    // Make sure the properties object exists, it should, but if it doesn't, set it
                    if (visitedPlaceGeography.properties === undefined) {
                        console.warn(
                            'widgetPersonVisitedPlacesMap: Visited place geography had no properties, setting to empty object'
                        );
                        visitedPlaceGeography.properties = {};
                    }
                    const visitedPlaceGeojson = visitedPlaceGeography;
                    visitedPlaceGeojson.properties!.icon = {
                        url: getActivityMarkerIcon(visitedPlace.activity),
                        size: [40, 40]
                    };
                    visitedPlaceGeojson.properties!.highlighted = false;
                    visitedPlaceGeojson.properties!.label = visitedPlace.name;
                    visitedPlaceGeojson.properties!.sequence = visitedPlace['_sequence'];
                    visitedPlacesGeojsonFeatures.push(
                        visitedPlaceGeojson as GeoJSON.Feature<GeoJSON.Point, SurveyMapObjectProperty>
                    );
                }
            }

            for (let i = 0, count = visitedPlacesGeojsonFeatures.length; i < count - 1; i++) {
                const visitedPlace = visitedPlacesGeojsonFeatures[i];
                const nextVisitedPlace = visitedPlacesGeojsonFeatures[i + 1];
                // FIXME Handle the superposed Sequence if there are multiple
                // sequences, but this can be done when part of the code is
                // moved outside this function
                tripsGeojsonFeatures.push(
                    pointsToBezierCurve([visitedPlace.geometry, nextVisitedPlace.geometry], {
                        superposedSequence: 0
                    }) as GeoJSON.Feature<GeoJSON.LineString, SurveyMapObjectProperty>
                );
            }

            return {
                points: {
                    type: 'FeatureCollection',
                    features: visitedPlacesGeojsonFeatures
                },
                linestrings: {
                    type: 'FeatureCollection',
                    features: tripsGeojsonFeatures
                }
            };
        }
    };
};
