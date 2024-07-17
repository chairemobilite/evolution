/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from 'evolution-common/lib/services/widgets';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { TFunction } from 'i18next';
import * as odHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { Person, Segment } from 'evolution-common/lib/services/interviews/interview';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { getPreviousTripSingleSegment } from './helpers';

/** TODO Get a segment config in parameter to set the sort order and choices */
const getModePreChoices = () => [
    {
        value: 'carDriver',
        label: (t: TFunction) => t(['customSurvey:segments:mode:CarDriver', 'segments:mode:CarDriver']),
        conditional: function (interview, path) {
            const person = odHelpers.getActivePerson({ interview });
            if (person === null) {
                return true;
            }
            const drivingLicenseOwner =
                person && person.drivingLicenseOwnership !== undefined ? person.drivingLicenseOwnership : 'dontKnow';
            if (
                drivingLicenseOwner === 'dontKnow' &&
                ((person.age && person.age > config.drivingLicenseAge) || !person.age)
            ) {
                // Check the person's age to not offer the carDriver option if the person is too young
                return true;
            }
            return drivingLicenseOwner === 'yes';
        },
        iconPath: '/dist/images/modes_icons/carDriver.png'
    },
    {
        value: 'carPassenger',
        label: (t: TFunction) => t(['customSurvey:segments:mode:CarPassenger', 'segments:mode:CarPassenger']),
        iconPath: '/dist/images/modes_icons/carPassenger.png'
    },
    {
        value: 'walk',
        label: (t: TFunction, interview) => {
            const person = odHelpers.getActivePerson({ interview });
            const personMayHaveDisability = person && odHelpers.personMayHaveDisability({ person: person as Person });
            return personMayHaveDisability
                ? t(['customSurvey:segments:mode:WalkOrMobilityHelp', 'segments:mode:WalkOrMobilityHelp'])
                : t(['customSurvey:segments:mode:Walk', 'segments:mode:Walk']);
        },
        iconPath: '/dist/images/modes_icons/walk.png'
    },
    {
        value: 'bicycle',
        label: (t: TFunction) => t(['customSurvey:segments:mode:Bicycle', 'segments:mode:Bicycle']),
        iconPath: '/dist/images/modes_icons/bicycle.png'
    },
    {
        value: 'transit',
        label: (t: TFunction) => t(['customSurvey:segments:mode:Transit', 'segments:mode:Transit']),
        iconPath: '/dist/images/modes_icons/bus.png'
    },
    {
        value: 'taxi',
        label: (t: TFunction) => t(['customSurvey:segments:mode:Taxi', 'segments:mode:Taxi']),
        iconPath: '/dist/images/modes_icons/taxi.png'
    },
    {
        value: 'other',
        label: (t: TFunction) => t(['customSurvey:segments:mode:Other', 'segments:mode:Other']),
        iconPath: '/dist/images/modes_icons/other.png'
    },
    {
        value: 'dontKnow',
        label: (t: TFunction) => t(['customSurvey:segments:mode:DontKnow', 'segments:mode:DontKnow']),
        iconPath: '/dist/images/modes_icons/dontKnow.png'
    }
];

export const getModePreWidgetConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: () => string } = {}
): WidgetConfig => {
    // TODO Use a segment configuration to determine which modes should be
    // presented and in which order

    return {
        type: 'question',
        path: 'modePre',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'string',
        iconSize: '1.5em',
        columns: 2,
        label: (t: TFunction, interview, path) => {
            const person = odHelpers.getPerson({ interview });
            const journey = odHelpers.getActiveJourney({ interview, person });
            const sequence = getResponse(interview, path, null, '../_sequence');
            const trip = odHelpers.getActiveTrip({ interview, journey });
            const visitedPlaces = journey ? odHelpers.getVisitedPlaces({ journey }) : {};
            // This should never happen, but just in case
            if (!trip || !journey || !person) {
                console.log(
                    'Error: trip, journey or person is null in getModePreWidgetConfig, they should all be defined'
                );
                return '';
            }
            const origin = odHelpers.getOrigin({ trip: trip!, visitedPlaces });
            const originName = origin
                ? odHelpers.getVisitedPlaceName({ t, visitedPlace: origin, interview })
                : t(['customSurvey:survey:origin', 'survey:origin']);
            const destination = odHelpers.getDestination({ trip: trip!, visitedPlaces });
            const destinationName = destination
                ? odHelpers.getVisitedPlaceName({ t, visitedPlace: destination, interview })
                : t(['customSurvey:survey:destination', 'survey:destination']);
            return sequence === 1
                ? t(['customSurvey:segments:ModeFirst', 'segments:ModeFirst'], {
                    context: options.context?.(),
                    originName,
                    destinationName,
                    count: odHelpers.getCountOrSelfDeclared({ interview, person })
                })
                : t(['customSurvey:segments:ModeThen', 'segments:ModeThen'], {
                    context: options.context?.(),
                    originName,
                    destinationName,
                    count: odHelpers.getCountOrSelfDeclared({ interview, person })
                });
        },
        choices: getModePreChoices(),
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t(['survey:segments:ModeIsRequired', 'segments:ModeIsRequired'])
                }
            ];
        },
        conditional: function (interview, path) {
            const segment = getResponse(interview, path, null, '../') as Segment;
            // If the segment is new and has been said to be same as reverse trip, get the modePre from reverse trip
            if (segment.sameModeAsReverseTrip === true && segment._isNew !== false) {
                const previousTripSegment = getPreviousTripSingleSegment({
                    interview,
                    person: odHelpers.getActivePerson({ interview }) as Person
                });
                if (previousTripSegment && previousTripSegment.modePre !== undefined) {
                    return [false, previousTripSegment.modePre];
                }
            }
            return [true, null];
        }
    };
};
