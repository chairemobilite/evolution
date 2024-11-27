/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _upperFirst from 'lodash/upperFirst';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from '../../../widgets';
import { getResponse } from '../../../../utils/helpers';
import { TFunction } from 'i18next';
import * as odHelpers from '../../../odSurvey/helpers';
import { getPreviousTripSingleSegment, shouldShowSameAsReverseTripQuestion } from './helpers';
import { Mode, modeValues } from '../../../baseObjects/attributeTypes/SegmentAttributes';
import { modePreToModeMap } from '../../../odSurvey/types';
import { ParsingFunction, Person, Segment } from '../../types';

// FIXME Move in helpers if required
const conditionalPersonMayHaveDisability = (interview) => {
    const person = odHelpers.getActivePerson({ interview });
    const personMayHaveDisability = person ? odHelpers.personMayHaveDisability({ person: person as Person }) : true;
    return personMayHaveDisability;
};

const conditionalHhMayHaveDisability = (interview) => odHelpers.householdMayHaveDisability({ interview });

const perModeConditionals: Partial<{ [mode in Mode]: ParsingFunction<boolean> }> = {
    wheelchair: conditionalPersonMayHaveDisability,
    mobilityScooter: conditionalPersonMayHaveDisability,
    paratransit: conditionalHhMayHaveDisability
};

/** TODO Get a segment config in parameter to set the sort order and choices */
const getModeChoices = () =>
    modeValues.map((mode) => ({
        value: mode,
        label: (t: TFunction) =>
            t([`customSurvey:segments:mode:${_upperFirst(mode)}`, `segments:mode:${_upperFirst(mode)}`]),
        conditional: function (interview, path) {
            const segment = getResponse(interview, path, null, '../') as Segment;
            if (segment !== null && segment.modePre) {
                if (!modePreToModeMap[segment.modePre].includes(mode)) {
                    return false;
                }
            }
            // See if there's any additional conditional for the mode
            const conditional = perModeConditionals[mode];
            return conditional ? conditional(interview, path) : true;
        },
        iconPath: `/dist/images/modes_icons/${mode}.png`
    }));

export const getModeWidgetConfig = (
    // FIXME: Type this when there is a few more widgets implemented
    options: { context?: () => string } = {}
): WidgetConfig => {
    // TODO Use a segment configuration to determine which modes should be
    // presented and in which order
    const segmentModeChoices = getModeChoices();

    return {
        type: 'question',
        path: 'mode',
        inputType: 'radio',
        twoColumns: false,
        datatype: 'string',
        iconSize: '1.5em',
        columns: 2,
        label: (t: TFunction) =>
            t(['customSurvey:segments:ModeSpecify', 'segments:ModeSpecify'], {
                context: options.context?.()
            }),
        choices: segmentModeChoices,
        validations: function (value) {
            return [
                {
                    validation: _isBlank(value),
                    errorMessage: (t: TFunction) =>
                        t(['customSurvey:segments:ModeIsRequired', 'segments:ModeIsRequired'])
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
                    if (previousTripSegment && previousTripSegment.mode !== undefined) {
                        return [false, previousTripSegment.mode];
                    }
                }
                // Otherwise, initialize to null
                return [false, null];
            }
            // Make sure modePre is selected before displaying
            const modePre = segment ? segment.modePre : null;
            if (_isBlank(modePre)) {
                return [false, null];
            }
            // Check if there is more than one choice available for this trip
            const modes = segmentModeChoices.filter((choice) => choice.conditional(interview, path) === true);
            if (modes.length === 1 || modes.length === 0) {
                return [false, modes[0] ? modes[0].value : modePre];
            }
            return [true, null];
        }
    };
};
