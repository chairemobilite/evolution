/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import i18n, { type TFunction } from 'i18next';
import config from '../../../../config/project.config';
import type { VisitedPlacesSectionConfiguration, WidgetConfig } from '../../types';
import { type LocationWithNameWidgetOptions, LocationWithNameWidgetsFactory } from '../common/widgetsLocation';
import type { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import * as odHelpers from '../../../odSurvey/helpers';
import { getResponse } from '../../../../utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type Activity, loopActivities } from '../../../odSurvey/types';
import { getActivityMarkerIcon } from './activityIconMapping';

// This is the minimum zoom required to avoid placement errors when selecting an
// exact location at a micro scale.
//
// FIXME We need to decide where to put it though, not here: in the
// questionnaire configuration itself, to fine-tune for different fields (they
// may not all require the same level of precision)? in the project
// configuration for all geographies? It should also be possible to configure it
// for specific visited place use cases depending on the desired scale (long
// distance surveys, where we may want a more macro scale may accept a lower
// zoom level)
const visitedPlacesMapClickDragDefaultZoom = 15;

/**
 * Widget factory that creates a pair of widgets for a location name and geography
 */
export class VisitedPlaceGeographyWidgetFactory implements WidgetConfigFactory {
    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        /** Nothing to do */
    }

    private getNameWidgetConfiguration = (): LocationWithNameWidgetOptions['nameWidget'] => ({
        containsHtml: true,
        label: (t: TFunction, interview, path) => {
            const activity = getResponse(interview, path, null, '../activity');

            // FIXME In the OD nationale questionnaire, there was a
            // special case label for people who work on the road often
            // with condition `_booleish((person as any).workOnTheRoad)
            // === true && activity === 'workUsual'` to have activyt
            // workOnTheRoadOften. See if we want to support it here
            const key = 'visitedPlaces:LocationNameAddressExample';

            const helpText =
                i18n.exists(key) && !_isBlank(activity)
                    ? `<span class="_pale _oblique">(${t('survey:forExampleAbbreviation')}: ${t(key, { context: activity })})</span>`
                    : '';
            return t('visitedPlaces:LocationNameAddress') + ' ' + helpText;
        },
        conditional: (interview, path) => {
            const visitedPlace: any = getResponse(interview, path, null, '../');
            const activity = visitedPlace.activity;
            const person = odHelpers.getActivePerson({ interview });

            // Do not display if the activity is a usual place and that place is set
            if (activity === 'workUsual' && (person as any).usualWorkPlace && (person as any).usualWorkPlace.name) {
                return [false, (person as any).usualWorkPlace.name];
            }
            if (
                activity === 'schoolUsual' &&
                (person as any).usualSchoolPlace &&
                (person as any).usualSchoolPlace.name
            ) {
                return [false, (person as any).usualSchoolPlace.name];
            }

            // TODO Add the already selected place logic here (https://github.com/chairemobilite/evolution/issues/1455). For now, we ignore

            // Do not display for loop activity if activity is not set, if it is home or loop activity and it is not an already visited place
            const shouldDisplay = !_isBlank(activity) && ![...loopActivities, 'home'].includes(activity);
            return [shouldDisplay, null];
        },
        validations: (value) => {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t('visitedPlaces:activityNameIsRequiredError')
                }
            ];
        }
        // TODO Add the default value as the shorcut name
    });

    private getGeographyWidgetConfiguration = (): LocationWithNameWidgetOptions['geographyWidget'] => ({
        containsHtml: true,
        label: (t: TFunction) => t('visitedPlaces:geography'),
        refreshGeocodingLabel: (t: TFunction) => t('visitedPlaces:refreshGeocodingButton'),
        icon: {
            url: (interview, path) => {
                // Get the icons for the activity
                const activity = getResponse(interview, path, null, '../activity') as Activity | null;
                return getActivityMarkerIcon(activity);
            },
            size: [70, 70]
        },
        defaultCenter: function (interview) {
            // Center on the previous visited place geography if it exists, otherwise center on home geography, otherwise use the default center
            const journey = odHelpers.getActiveJourney({ interview });
            const visitedPlace = odHelpers.getActiveVisitedPlace({ interview, journey });
            const previousVisitedPlace =
                visitedPlace && journey
                    ? odHelpers.getPreviousVisitedPlace({ journey, visitedPlaceId: visitedPlace._uuid })
                    : undefined;
            if (previousVisitedPlace) {
                const person = odHelpers.getActivePerson({ interview });
                const geography = person
                    ? odHelpers.getVisitedPlaceGeography({ visitedPlace: previousVisitedPlace, interview, person })
                    : undefined;
                if (geography) {
                    const coordinates = _get(geography, 'geometry.coordinates', null);
                    if (coordinates) {
                        return {
                            lat: coordinates[1],
                            lon: coordinates[0]
                        };
                    }
                }
            }
            const homeCoordinates: any = getResponse(interview, 'home.geography.geometry.coordinates', null);
            return homeCoordinates
                ? {
                    lat: homeCoordinates[1],
                    lon: homeCoordinates[0]
                }
                : config.mapDefaultCenter;
        },
        validations: (value, _customValue, interview, path) => {
            const activity: any = getResponse(interview, path, null, '../activity');
            const geography: any = getResponse(interview, path, null, '../geography');
            const geocodingTextInput = geography ? geography.properties?.geocodingQueryString : undefined;
            const validations: any[] = [
                {
                    // FIXME This is taken as is from od_nationale, but since the condition is expected to be false in those cases, it should simply be mandatory no?
                    validation: ['home', ...loopActivities].indexOf(activity) <= -1 && _isBlank(value),
                    errorMessage: (t: TFunction) => t('visitedPlaces:locationIsRequiredError')
                },
                {
                    validation:
                        geography &&
                        geography.properties.lastAction &&
                        (geography.properties.lastAction === 'mapClicked' ||
                            geography.properties.lastAction === 'markerDragged') &&
                        geography.properties.zoom < visitedPlacesMapClickDragDefaultZoom,
                    errorMessage: (t: TFunction) => t('visitedPlaces:locationIsNotPreciseError')
                },
                // TODO Should an inaccessible zone validation here when we support it from survey configuration
                {
                    validation: geography && geography.properties?.isGeocodingImprecise,
                    errorMessage: (t: TFunction) =>
                        t('survey:geography.geocodingStringImpreciseError', {
                            geocodingTextInput: geocodingTextInput || '',
                            interpolation: { escapeValue: true }
                        })
                }
            ];
            return validations;
        },
        // TODO The original od_natioanle did not show the geocoding button when the place was a shortcut. We should decide if that is the right behavior and if so, bring back that behavior, when we support already located place
        conditional: (interview, path) => {
            const visitedPlace: any = getResponse(interview, path, null, '../');
            const activity = visitedPlace.activity;
            const person = odHelpers.getActivePerson({ interview });
            // Do not diplay if the activity is a usual place and that place is set with a geography
            if (
                activity === 'workUsual' &&
                (person as any).usualWorkPlace &&
                (person as any).usualWorkPlace.geography
            ) {
                return [false, _cloneDeep((person as any).usualWorkPlace.geography)];
            }
            if (
                activity === 'schoolUsual' &&
                (person as any).usualSchoolPlace &&
                (person as any).usualSchoolPlace.geography
            ) {
                return [false, _cloneDeep((person as any).usualSchoolPlace.geography)];
            }

            // TODO Add the already selected place logic here (https://github.com/chairemobilite/evolution/issues/1455).
            return [!_isBlank(activity) && ![...loopActivities, 'home'].includes(activity), null];
        }
    });

    getWidgetConfigs = (): Record<string, WidgetConfig> => {
        // Will generate a visitedPlaceName and visitedPlaceGeography widget
        // with the appropriate configuration, where paths are within the
        // visited place group
        const locationWidgetFactory = new LocationWithNameWidgetsFactory({
            widgetNamePrefix: 'visitedPlace',
            nameWidget: this.getNameWidgetConfiguration(),
            geographyWidget: this.getGeographyWidgetConfiguration()
        });

        return locationWidgetFactory.getWidgetConfigs();
    };
}
