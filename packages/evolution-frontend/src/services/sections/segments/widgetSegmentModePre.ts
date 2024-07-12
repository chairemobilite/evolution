/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from "chaire-lib-common/lib/utils/LodashExtensions";
import { SegmentSectionConfig } from "evolution-common/lib/services/sections/segmentSection";
import { WidgetConfig } from "evolution-common/lib/services/widgets";
import { getResponse } from "evolution-common/lib/utils/helpers";
import { TFunction } from "i18next";
import { getActiveTrip, getPerson, getVisitedPlaces } from "evolution-common/lib/services/odSurvey/helpers";

export const getModePreWidgetConfig = (sectionConfig: SegmentSectionConfig): WidgetConfig => {
    const config = {
        type: 'question',
        path: 'modePre',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'string',
        iconSize: '1.5em',
        columns: 2,
        label: (t: TFunction, interview, path) => {
            const person = getPerson(interview);
            const sequence = getResponse(interview, path, null, '../_sequence');
            const trip = getActiveTrip(interview, person);
            const visitedPlaces = person ? getVisitedPlaces(person) : {};
            const origin = helper.getOrigin(trip, visitedPlaces);
            const originName = origin ? helper.getVisitedPlaceName(origin, t, interview) : t('survey:origin');
            const destination = helper.getDestination(trip, visitedPlaces);
            const destinationName = destination
                ? helper.getVisitedPlaceName(destination, t, interview)
                : t('survey:destination');
            return sequence === 1
                ? t('segments:PremierModeChoix', {
                    context: getI18nContext(),
                    originName,
                    destinationName,
                    count: helper.getCountOrSelfDeclared(interview, person)
                })
                : t('segments:ModeChoixAutre', {
                    context: getI18nContext(),
                    originName,
                    destinationName,
                    count: helper.getCountOrSelfDeclared(interview, person)
                });
        },
        choices: [
            {
                value: 'carDriver',
                label: {
                    fr: '<strong>Conducteur</strong> (voiture/moto/scooter)',
                    en: '<strong>Driver</strong> (car/moto/scooter)'
                },
                conditional: function (interview, path) {
                    const person = getPerson(interview);
                    const drivingLicenseOwner = person ? person.drivingLicenseOwner : 'dontKnow';
                    return drivingLicenseOwner === 'yes';
                },
                iconPath: '/dist/images/modes_icons/carDriver.png'
            },
            {
                value: 'carPassenger',
                label: {
                    fr: '<strong>Passager</strong> (voiture/moto/scooter)',
                    en: '<strong>Passenger (car/moto/scooter)</strong>'
                },
                iconPath: '/dist/images/modes_icons/carPassenger.png'
            },
            {
                value: 'taxi',
                label: {
                    fr: '<strong>Taxi</strong> ou équivalent (ex. Uber)',
                    en: '<strong>Taxi</strong> or equivalent (eg. Uber)'
                },
                iconPath: '/dist/images/modes_icons/taxi.png'
            },
            {
                value: 'bicycle',
                label: {
                    fr: '<strong>Vélo</strong> ou <strong> Vélo électrique</strong>',
                    en: '<strong>Bicycle</strong> or <strong>electric bicycle</strong>'
                },
                iconPath: '/dist/images/modes_icons/bicycle.png'
            },
            {
                value: 'bus',
                label: {
                    fr: '<strong>Autobus</strong>',
                    en: '<strong>Bus</strong>'
                },
                iconPath: '/dist/images/modes_icons/bus.png'
            },
            {
                value: 'ferry',
                label: {
                    fr: '<strong>Traversier</strong>',
                    en: '<strong>Ferry</strong>'
                },
                iconPath: '/dist/images/modes_icons/ferry.png'
            },
            {
                value: 'walk',
                label: {
                    fr: '<strong>Marche</strong>',
                    en: '<strong>Walking</strong>'
                },
                iconPath: '/dist/images/modes_icons/walk.png'
            },
            {
                value: 'other',
                label: {
                    fr: '<strong>Autre</strong>',
                    en: '<strong>Other</strong>'
                },
                iconPath: '/dist/images/modes_icons/other.png'
            },
            {
                value: 'dontKnow',
                label: {
                    fr: '<strong>Je ne sais pas</strong> / Préfère ne pas répondre',
                    en: '<strong>I don\'t know</strong> / Prefer not to answer'
                },
                iconPath: '/dist/images/modes_icons/dontKnow.png'
            }
        ],
        validations: function (value, customValue, interview, path, customPath) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: {
                        fr: 'Le mode de transport est requis.',
                        en: 'Mode of transportation is required.'
                    }
                }
            ];
        },
        conditional: function (interview, path) {
            const sameModeAsReverseTrip = getResponse(interview, path, null, '../sameModeAsReverseTrip');
            if (sameModeAsReverseTrip === true || sameModeAsReverseTrip === 'yes') {
                const person = helper.getPerson(interview);
                const trip = helper.getActiveTrip(interview);
                const tripsAsArray = helper.getTrips(person, true);
                const previousTrip = helper.getPreviousTrip(trip._uuid, tripsAsArray);
                const previousTripSegmentsAsArray = previousTrip ? helper.getSegments(previousTrip, true) : [];
                const previousTripSegmentsMode = previousTripSegmentsAsArray[0]
                    ? previousTripSegmentsAsArray[0].modePre
                    : null;
                if (!_isBlank(previousTripSegmentsMode)) {
                    return [false, previousTripSegmentsMode];
                }
            }
            return [true, null];
        }
    };
}