/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _upperFirst from 'lodash/upperFirst';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { WidgetConfig } from 'evolution-common/lib/services/widgets';
import { getResponse, ParsingFunction } from 'evolution-common/lib/utils/helpers';
import { TFunction } from 'i18next';
import * as odHelpers from 'evolution-common/lib/services/odSurvey/helpers';
import { Person, Segment } from 'evolution-common/lib/services/interviews/interview';
import { getPreviousTripSingleSegment } from './helpers';
import { Mode, modeValues } from 'evolution-common/lib/services/baseObjects/attributeTypes/SegmentAttributes';
import { modePreToModeMap } from 'evolution-common/lib/services/odSurvey/types';

// TODO Move in helpers
const conditionalPersonMayHaveDisability = (interview) => {
    const person = odHelpers.getActivePerson({ interview });
    const personMayHaveDisability = person ? odHelpers.personMayHaveDisability({ person: person as Person }) : true;
    return personMayHaveDisability;
};

const conditionalHhMayHaveDisability = (interview) => {
    const person = odHelpers.getActivePerson({ interview });
    const personMayHaveDisability = person ? odHelpers.personMayHaveDisability({ person: person as Person }) : true;
    return personMayHaveDisability;
};

const perModeConditionals: Partial<{ [mode in Mode]: ParsingFunction<boolean> }> = {
    wheelchair: conditionalPersonMayHaveDisability,
    mobilityScooter: conditionalPersonMayHaveDisability,
    paratransit: conditionalHhMayHaveDisability
};

/** TODO Get a segment config in parameter to set the sort order and choices */
const getModePreChoices = () =>
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
    const segmentModeChoices = getModePreChoices();

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
            // Make sure modePre is selected before displaying
            const modePre = segment ? segment.modePre : null;
            if (_isBlank(modePre)) {
                return [false, null];
            }
            // Check if there is more than one choice available for this trip
            const modes = segmentModeChoices.filter((choice) => {
                return choice.conditional(interview, path) === true;
            });
            if (modes.length === 1 || modes.length === 0) {
                return [false, modes[0] ? modes[0].value : modePre];
            }
            return [true, null];
        }
    };
};
