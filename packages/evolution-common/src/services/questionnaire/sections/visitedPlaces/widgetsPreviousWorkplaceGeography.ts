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
import type { QuestionWidgetConfig, VisitedPlacesSectionConfiguration, WidgetConditional } from '../../types';
import { type LocationWithNameWidgetOptions, LocationWithNameWidgetsFactory } from '../common/widgetsLocation';
import type { WidgetConfigFactory, WidgetFactoryOptions } from '../types';
import * as odHelpers from '../../../odSurvey/helpers';
import { getResponse } from '../../../../utils/helpers';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import * as visitedPlacesHelpers from './helpers';
import { getActivityMarkerIcon } from './activityIconMapping';
import { requiredValidation } from '../../../widgets/validations/validations';

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
 * Widget factory that creates a pair of widgets for the previous work place
 * location. These widgets are used only in the case where the usual places are
 * inlined in the trip diary, for `onTheRoad` activities with departure from a
 * usual work place that is not defined yet.
 */
export class PreviousWorkPlaceGeographyWidgetFactory implements WidgetConfigFactory {
    private readonly mayDisplayTheseWidgets: boolean;

    constructor(
        private sectionConfig: VisitedPlacesSectionConfiguration,
        private options: WidgetFactoryOptions
    ) {
        this.mayDisplayTheseWidgets = sectionConfig.inlineUsualPlacesEntry === true;
    }

    private previousWorkPlaceConditional: (field: 'name' | 'geography') => WidgetConditional =
        (field: 'name' | 'geography') => (interview, path) => {
            // Display if usual places are inlined, if the `visitedPlaceOnTheRoadPreviousPlaceActivity` is 'workUsual' and the person has no usual work place set (if the person has a place defined already, take its value)
            if (!this.mayDisplayTheseWidgets) {
                return false;
            }

            const visitedPlaceContext = odHelpers.getVisitedPlaceContextFromPath({ interview, path });
            if (visitedPlaceContext === null) {
                throw new Error(
                    `PreviousWorkPlaceGeographyWidgetFactory: cannot find visited place context for path ${path}`
                );
            }
            const { visitedPlace } = visitedPlaceContext;
            // Previous on the road activity is not workUsual, do not display
            if (visitedPlace.onTheRoadPreviousPlaceActivity !== 'workUsual') {
                return false;
            }

            // See if there is a workplace already set. Use this as default value if so, otherwise, display
            const { usualPlace } = visitedPlacesHelpers.getPersonUsualWorkPlace(interview, path);
            // Place not set, display it
            if (usualPlace === null) {
                return true;
            }
            // Place set, hide if the property to display is set, with default value
            const usualPlaceValue = usualPlace[field];
            return [usualPlaceValue === undefined, usualPlaceValue];
        };

    private getNameWidgetConfiguration = (): LocationWithNameWidgetOptions['nameWidget'] => ({
        containsHtml: true,
        label: (t: TFunction, interview, path) => {
            const person = odHelpers.getPerson({ interview, path });
            if (person === null) {
                throw new Error('PreviousWorkPlaceGeographyWidgetFactory: Person not found in interview response');
            }
            const key = 'visitedPlaces:visitedPlaceNameExample';

            const helpText = i18n.exists(key)
                ? `<span class="_pale _oblique">(${t('survey:forExampleAbbreviation')}: ${t(key, { context: 'workUsual_onTheRoadOften' })})</span>`
                : '';
            return (
                t('visitedPlaces:visitedPlacePreviousWorkPlaceName', {
                    context: odHelpers.getPersonGenderContext({ person }),
                    nickname: odHelpers.getPersonIdentificationString({ person, t }),
                    count: odHelpers.getCountOrSelfDeclared({ interview, person })
                }) +
                ' ' +
                helpText
            );
        },
        conditional: this.previousWorkPlaceConditional('name'),
        validations: requiredValidation
    });

    private getGeographyWidgetConfiguration = (): LocationWithNameWidgetOptions['geographyWidget'] => ({
        containsHtml: true,
        label: (t: TFunction, interview, path) => {
            const person = odHelpers.getPerson({ interview, path });
            if (person === null) {
                throw new Error('PreviousWorkPlaceGeographyWidgetFactory: Person not found in interview response');
            }
            return t('visitedPlaces:visitedPlacePreviousWorkPlaceGeography', {
                context: odHelpers.getPersonGenderContext({ person }),
                nickname: odHelpers.getPersonIdentificationString({ person, t }),
                count: odHelpers.getCountOrSelfDeclared({ interview, person })
            });
        },
        refreshGeocodingLabel: (t: TFunction) => t('visitedPlaces:refreshGeocodingButton'),
        icon: {
            url: getActivityMarkerIcon('workUsual'),
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
            const homeCoordinates = getResponse(interview, 'home.geography.geometry.coordinates', null) as
                | null
                | [number, number];
            return homeCoordinates
                ? {
                    lat: homeCoordinates[1],
                    lon: homeCoordinates[0]
                }
                : config.mapDefaultCenter;
        },
        validations: (value) => {
            const geography = value as GeoJSON.Feature<GeoJSON.Point> | null | undefined;
            const geocodingTextInput = geography ? geography.properties?.geocodingQueryString : undefined;
            const validations: any[] = [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t('visitedPlaces:workPlaceLocationIsRequiredError')
                },
                {
                    validation:
                        geography &&
                        geography.properties?.lastAction &&
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
        conditional: this.previousWorkPlaceConditional('geography')
    });

    getWidgetConfigs = (): Record<string, QuestionWidgetConfig> => {
        // Will generate a _previousWorkPlaceName and
        // _previousWorkPlaceGeography widget with the appropriate
        // configuration, where paths are within the visited place group
        const locationWidgetFactory = new LocationWithNameWidgetsFactory({
            widgetNamePrefix: 'visitedPlacePreviousWorkPlace',
            path: '_previousWorkPlace',
            nameWidget: this.getNameWidgetConfiguration(),
            geographyWidget: this.getGeographyWidgetConfiguration()
        });

        return locationWidgetFactory.getWidgetConfigs();
    };
}
