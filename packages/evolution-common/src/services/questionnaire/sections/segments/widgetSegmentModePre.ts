/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _upperFirst from 'lodash/upperFirst';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { I18nData, SegmentSectionConfiguration, WidgetConditional, WidgetConfig } from '../../../questionnaire/types';
import { getResponse } from '../../../../utils/helpers';
import type { TFunction } from 'i18next';
import * as odHelpers from '../../../odSurvey/helpers';
import config from '../../../../config/project.config';
import * as segmentHelpers from './helpers';
import type { ModePre } from '../../../odSurvey/types';
import type { Person } from '../../types';
import { getModePreIcon } from './modeIconMapping';
import { WidgetFactoryOptions } from '../types';

const perModePreLabels: Partial<{ [mode in ModePre]: I18nData }> = {
    walk: (t: TFunction, interview) => {
        const person = odHelpers.getActivePerson({ interview });
        const personMayHaveDisability = person && odHelpers.personMayHaveDisability({ person: person as Person });
        return personMayHaveDisability
            ? t(['customSurvey:segments:modePre:WalkOrMobilityHelp', 'segments:modePre:WalkOrMobilityHelp'])
            : t(['customSurvey:segments:modePre:Walk', 'segments:modePre:Walk']);
    }
};

const canPersonDriveCar: WidgetConditional = (interview) => {
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
};

const perModePreConditionals: Partial<{ [mode in ModePre]: WidgetConditional }> = {
    paratransit: segmentHelpers.conditionalHhMayHaveDisability,
    carDriver: canPersonDriveCar
};

/** TODO Get a segment config in parameter to set the sort order and choices */
const getModePreChoices = (filteredModesPre: ModePre[]) =>
    filteredModesPre.map((mode) => ({
        value: mode,
        label: perModePreLabels[mode]
            ? perModePreLabels[mode]
            : (t: TFunction) =>
                t([`customSurvey:segments:modePre:${_upperFirst(mode)}`, `segments:modePre:${_upperFirst(mode)}`]),
        conditional: perModePreConditionals[mode] !== undefined ? perModePreConditionals[mode] : undefined,
        iconPath: getModePreIcon(mode)
    }));

export const getModePreWidgetConfig = (
    sectionConfig: SegmentSectionConfiguration,
    options: WidgetFactoryOptions
): WidgetConfig => {
    // TODO Use a segment configuration to determine which modes should be
    // presented and in which order
    const filteredModes = segmentHelpers.getFilteredModes(sectionConfig);
    if (filteredModes.length === 0) {
        throw new Error('No available modes to create modePre widget configuration');
    }
    const filteredModesPre = segmentHelpers.getFilteredModesPre(filteredModes);
    const choices = getModePreChoices(filteredModesPre);

    return {
        type: 'question',
        path: 'modePre',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'string',
        iconSize: '2.25em',
        columns: 2,
        choices,
        label: (t: TFunction, interview, path) => {
            const tripContext = odHelpers.getTripContextFromPath({ interview, path });
            if (!tripContext) {
                // This should not happen
                throw new Error(
                    'Error: trip, journey or person is null in getModePreWidgetConfig, they should all be defined'
                );
            }
            const { person, journey, trip } = tripContext;

            const sequence = getResponse(interview, path, null, '../_sequence');
            const visitedPlaces = journey ? odHelpers.getVisitedPlaces({ journey }) : {};
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
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) => t(['survey:segments:ModeIsRequired', 'segments:ModeIsRequired'])
                }
            ];
        },
        conditional: function (interview, path) {
            const segmentContext = odHelpers.getSegmentContextFromPath({ interview, path });
            if (!segmentContext) {
                throw new Error('Segment context not found for path ' + path);
            }
            const { journey, trip, segment } = segmentContext;
            const shouldShowSameAsReverseTrip = segmentHelpers.shouldShowSameAsReverseTripQuestion({
                interview,
                path
            });
            // Do not show if the question of the same mode as previous trip is shown and the answer is not 'no'
            if (shouldShowSameAsReverseTrip && segment.sameModeAsReverseTrip !== false) {
                if (segment.sameModeAsReverseTrip === true) {
                    // If the question of the same mode as previous trip is shown and the answer is yes, the mode is the same as the previous trip
                    const previousTripSegment = segmentHelpers.getPreviousTripSingleSegment({
                        journey,
                        trip
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
