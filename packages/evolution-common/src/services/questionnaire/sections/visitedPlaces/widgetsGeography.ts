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
import type { QuestionWidgetConfig, VisitedPlacesSectionConfiguration } from '../../types';
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

            // Do not display for loop activity if activity is not set, if it is
            // home or loop activity and it is not an already visited place
            const shouldDisplay =
                !_isBlank(activity) &&
                ![...loopActivities, 'home'].includes(activity) &&
                visitedPlace.alreadyVisitedBySelfOrAnotherHouseholdMember !== true;
            if (!shouldDisplay && visitedPlace.shortcut) {
                // Get the name from the shortcut if any.
                const visitedPlaceName = odHelpers.getVisitedPlaceName({ visitedPlace, interview, t: i18n.t });
                return [false, visitedPlaceName];
            }
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
        defaultCenter: function (interview, path) {
            // Center on the previous visited place geography if it exists, otherwise center on home geography, otherwise use the default center
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            const previousVisitedPlace = visitedPlaceContext
                ? odHelpers.getPreviousVisitedPlace({
                    journey: visitedPlaceContext.journey,
                    visitedPlaceId: visitedPlaceContext.visitedPlace._uuid
                })
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
        defaultValue: function (interview, path) {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceShortcut: defaultValue function: visited place context not found for path' + path
                );
            }
            const { person, visitedPlace } = visitedPlaceContext || {};

            // If the place is a shortcut, we want to default to the geography of the shortcut place
            if (visitedPlace.shortcut) {
                const shortcut = visitedPlace.shortcut;
                const shortcutVisitedPlace: any = getResponse(interview, shortcut, null);
                const geography = shortcutVisitedPlace
                    ? odHelpers.getVisitedPlaceGeography({ visitedPlace: shortcutVisitedPlace, interview, person })
                    : null;
                if (shortcutVisitedPlace && geography !== null) {
                    // clone the original shortcuted geography, otherwise it
                    // will change the lastAction of the previous geography,
                    // which is not correct.
                    const clonedGeography = _cloneDeep(geography);
                    if (clonedGeography.properties === undefined) {
                        clonedGeography.properties = {};
                    }
                    clonedGeography.properties!.lastAction = 'shortcut';
                    return clonedGeography;
                }
            }
            return undefined;
        },
        resetToDefaultUnlessUserInteracted: true,
        showSearchPlaceButton: (interview, path) => {
            // Do not show the search button if the place is a shortcut, as the name field is not apparent
            const visitedPlace: any = getResponse(interview, path, null, '../');
            return _isBlank(visitedPlace.shortcut);
        },
        conditional: (interview, path) => {
            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    'widgetVisitedPlaceShortcut: defaultValue function: visited place context not found for path' + path
                );
            }
            const { person, visitedPlace } = visitedPlaceContext || {};

            const activity = visitedPlace.activity;
            // Do not diplay if the activity is a usual place and that place is set with a geography
            if (activity === 'workUsual' && person.usualWorkPlace && person.usualWorkPlace.geography) {
                return [false, _cloneDeep(person.usualWorkPlace.geography)];
            }
            if (activity === 'schoolUsual' && person.usualSchoolPlace && person.usualSchoolPlace.geography) {
                return [false, _cloneDeep(person.usualSchoolPlace.geography)];
            }

            // Show if the activity is not home or a loop activity. If it is a
            // shortcut, show the geography for information, but the default
            // value will take care of setting it.
            return [!_isBlank(activity) && ![...loopActivities, 'home'].includes(activity!), null];
        }
    });

    getWidgetConfigs = (): Record<string, QuestionWidgetConfig> => {
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
