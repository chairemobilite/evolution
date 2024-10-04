/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _upperFirst from 'lodash/upperFirst';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from 'evolution-common/lib/services/widgets';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { TFunction } from 'i18next';
import * as odHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { Journey, Person } from 'evolution-common/lib/services/interviews/interview';
import { getPreviousTripSingleSegment, isSimpleChainSingleModeReturnTrip } from './helpers';

export const getSameAsReverseTripWidgetConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: () => string } = {}
): WidgetConfig => {
    return {
        type: 'question',
        path: 'sameModeAsReverseTrip',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'boolean',
        label: (t: TFunction, interview, path) => {
            const person = odHelpers.getPerson({ interview }) as Person;
            const previousSegment = getPreviousTripSingleSegment({ interview, person });
            const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;
            const trip = odHelpers.getActiveTrip({ interview, journey });
            const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
            const destination = trip ? odHelpers.getDestination({ trip, visitedPlaces }) : undefined;
            const labelWithDestination = `segments:SegmentSameModeReturn${destination && destination.activity === 'home' ? 'Home' : ''}`;
            return t([`customSurvey:${labelWithDestination}`, labelWithDestination], {
                context: options.context?.(),
                count: odHelpers.getCountOrSelfDeclared({ interview, person }),
                previousMode:
                    previousSegment && previousSegment.mode
                        ? t([
                            `customSurvey:segments:mode:short:${previousSegment.mode}`,
                            `segments:mode:short:${previousSegment.mode}`
                        ])
                        : ''
            });
        },
        choices: [
            {
                value: true,
                label: (t: TFunction) => t('survey:Yes')
            },
            {
                value: false,
                label: (t: TFunction) => t('survey:No')
            }
        ],
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t(['customSurvey:ResponseIsRequired', 'survey:ResponseIsRequired'])
                }
            ];
        },
        conditional: (interview, path) => {
            const segment: any = getResponse(interview, path, null, '../');
            // Do not display if segment is not new
            if (segment._isNew === false) {
                return [false, null];
            }
            const person = odHelpers.getPerson({ interview }) as Person;
            const journey = odHelpers.getActiveJourney({ interview, person }) as Journey;
            const trip = odHelpers.getActiveTrip({ interview, journey });
            const previousTrip = trip !== null ? odHelpers.getPreviousTrip({ currentTrip: trip, journey }) : null;
            return [
                trip !== null &&
                    previousTrip !== null &&
                    isSimpleChainSingleModeReturnTrip({ interview, journey, person, trip, previousTrip }),
                null
            ];
        }
    };
};
