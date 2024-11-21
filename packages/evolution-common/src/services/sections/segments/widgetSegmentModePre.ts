/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from '../../widgets';
import { getResponse } from '../../../utils/helpers';
import { TFunction } from 'i18next';
import * as odHelpers from '../../odSurvey/helpers';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { getPreviousTripSingleSegment, shouldShowSameAsReverseTripQuestion } from './helpers';
import { Person, Segment } from '../../questionnaire/types';

/** TODO Get a segment config in parameter to set the sort order and choices */
const getModePreChoices = () => [
    {
        value: 'carDriver',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:CarDriver', 'segments:modePre:CarDriver']),
        conditional: function (interview, path) {
            const person = odHelpers.getActivePerson({ interview });
            if (person === null) {
                return true;
            }
            const drivingLicenseOwnership =
                person && person.drivingLicenseOwnership !== undefined ? person.drivingLicenseOwnership : 'dontKnow';
            if (
                drivingLicenseOwnership === 'dontKnow' &&
                ((person.age && person.age > config.drivingLicenseAge) || !person.age)
            ) {
                // Check the person's age to not offer the carDriver option if the person is too young
                return true;
            }
            return drivingLicenseOwnership === 'yes';
        },
        iconPath: '/dist/images/modes_icons/carDriver.png'
    },
    {
        value: 'carPassenger',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:CarPassenger', 'segments:modePre:CarPassenger']),
        iconPath: '/dist/images/modes_icons/carPassenger.png'
    },
    {
        value: 'walk',
        label: (t: TFunction, interview) => {
            const person = odHelpers.getActivePerson({ interview });
            const personMayHaveDisability = person && odHelpers.personMayHaveDisability({ person: person as Person });
            return personMayHaveDisability
                ? t(['customSurvey:segments:modePre:WalkOrMobilityHelp', 'segments:modePre:WalkOrMobilityHelp'])
                : t(['customSurvey:segments:modePre:Walk', 'segments:modePre:Walk']);
        },
        iconPath: '/dist/images/modes_icons/walk.png'
    },
    {
        value: 'bicycle',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:Bicycle', 'segments:modePre:Bicycle']),
        iconPath: '/dist/images/modes_icons/bicycle.png'
    },
    {
        value: 'transit',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:Transit', 'segments:modePre:Transit']),
        iconPath: '/dist/images/modes_icons/bus.png'
    },
    {
        value: 'taxi',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:Taxi', 'segments:modePre:Taxi']),
        iconPath: '/dist/images/modes_icons/taxi.png'
    },
    {
        value: 'other',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:Other', 'segments:modePre:Other']),
        iconPath: '/dist/images/modes_icons/other.png'
    },
    {
        value: 'dontKnow',
        label: (t: TFunction) => t(['customSurvey:segments:modePre:DontKnow', 'segments:modePre:DontKnow']),
        iconPath: '/dist/images/modes_icons/dontKnow.png'
    },
    {
        value: 'preferNotToAnswer',
        label: (t: TFunction) =>
            t(['customSurvey:segments:modePre:PreferNotToAnswer', 'segments:modePre:PreferNotToAnswer']),
        iconPath: '/dist/images/modes_icons/preferNotToAnswer.png'
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
            const shouldShowSameAsReverseTrip = shouldShowSameAsReverseTripQuestion({ interview, segment });
            // Do not show if the question of the same mode as previous trip is shown and the answer is not 'no'
            if (shouldShowSameAsReverseTrip && segment.sameModeAsReverseTrip !== false) {
                if (segment.sameModeAsReverseTrip === true) {
                    // If the question of the same mode as previous trip is shown and the answer is yes, the mode is the same as the previous trip
                    const previousTripSegment = getPreviousTripSingleSegment({
                        interview,
                        person: odHelpers.getActivePerson({ interview }) as Person
                    });
                    if (previousTripSegment && previousTripSegment.modePre !== undefined) {
                        return [false, previousTripSegment.modePre];
                    }
                }
                // Otherwise, initialize to null
                return [false, null];
            }
            return [true, null];
        }
    };
};
