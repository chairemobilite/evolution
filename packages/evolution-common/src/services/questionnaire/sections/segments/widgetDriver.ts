/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type {
    ChoiceType,
    GroupedChoiceType,
    SegmentSectionConfiguration,
    UserInterviewAttributes,
    WidgetConfig
} from '../../types';
import { getResponse } from '../../../../utils/helpers';
import type { TFunction } from 'i18next';
import * as odHelpers from '../../../odSurvey/helpers';
import * as validations from '../../../widgets/validations/validations';
import type { WidgetFactoryOptions } from '../types';

const getDriverChoices = (interview: UserInterviewAttributes): (GroupedChoiceType | ChoiceType)[] => {
    const person = odHelpers.getActivePerson({ interview });
    if (!person) {
        return [];
    }
    const choices: (GroupedChoiceType | ChoiceType)[] = [
        {
            groupShortname: '',
            groupLabel: '',
            choices: [
                {
                    value: 'familyMember',
                    label: (t: TFunction) => t('segments:DriverFamily')
                },
                {
                    value: 'colleague',
                    label: (t: TFunction) => t('segments:DriverColleague')
                }
            ]
        },
        {
            groupShortname: '',
            groupLabel: '',
            choices: [
                {
                    value: 'taxiDriver',
                    label: (t: TFunction) => t('segments:DriverTaxi')
                },
                {
                    value: 'transitTaxiDriver',
                    label: (t: TFunction) => t('segments:DriverTransitTaxi')
                },
                {
                    value: 'paratransit',
                    label: (t: TFunction) => t('segments:DriverParaTransit'),
                    conditional: function (interview) {
                        // paratransit can be used by an accompanying person
                        // too, so show this mode for any household with at
                        // least one person with disability:
                        return (
                            odHelpers.personMayHaveDisability({ person }) ||
                            odHelpers.householdMayHaveDisability({ interview })
                        );
                    }
                },
                {
                    value: 'carpool',
                    label: (t: TFunction) => t('segments:DriverCarpool')
                },
                {
                    value: 'other',
                    label: (t: TFunction) => t('segments:DriverOther')
                },
                {
                    value: 'dontKnow',
                    label: (t: TFunction) => t('segments:DriverDontKnow'),
                    // Do not add the don't know to the choices for
                    // self-respondent or single person households
                    conditional: (interview) => odHelpers.getCountOrSelfDeclared({ interview, person }) > 1
                }
            ]
        }
    ];
    // Ajout des personnes avec permis dans le ménage
    const drivers = odHelpers.getPotentialDrivers({ interview });
    const hhDrivers: ChoiceType[] = [];
    for (let i = 0, count = drivers.length; i < count; i++) {
        const driver = drivers[i];
        if (typeof driver._uuid === 'string' && driver._uuid !== person._uuid) {
            hhDrivers.push({
                value: driver._uuid,
                label:
                    typeof driver.nickname === 'string' && !_isBlank(driver.nickname.trim())
                        ? driver.nickname
                        : // FIXME Evolution questionnaires do not currently support gender/sexAssignedAtBirth in a satisfactory way. Make sure this is still correct when we have full support
                        (t: TFunction) =>
                            t('survey:personWithSequenceAndAge', {
                                sequence: driver['_sequence'],
                                age: driver['age'] ?? '-',
                                context: driver.gender ?? driver.sexAssignedAtBirth
                            })
            });
        }
    }
    // Add drivers at the beginning of the choices array
    if (hhDrivers.length > 0) {
        choices.unshift({
            groupShortname: '',
            groupLabel: '',
            choices: hhDrivers
        });
    }
    return choices;
};

export const getSegmentDriverWidgetConfig = (
    _sectionConfig: SegmentSectionConfiguration,
    _options: WidgetFactoryOptions
): WidgetConfig => {
    // TODO Add section configuration option to determine if this question is mandatory
    return {
        type: 'question',
        path: 'driver',
        inputType: 'select',
        datatype: 'string',
        twoColumns: false,
        label: (t: TFunction, interview) => {
            const person = odHelpers.getActivePerson({ interview });
            return t('segments:Driver', {
                context: person?.gender || person?.sexAssignedAtBirth,
                count: person ? odHelpers.getCountOrSelfDeclared({ interview, person }) : 1
            });
        },
        choices: getDriverChoices,
        conditional: function (interview, path) {
            const mode = getResponse(interview, path, null, '../mode');
            if (mode !== 'carPassenger') {
                return [false, null];
            }
            const trip = odHelpers.getActiveTrip({ interview });
            const journey = odHelpers.getActiveJourney({ interview });
            if (!trip || !journey) {
                console.error(
                    'Error: trip or journey is null in getSegmentHasNextModeWidgetConfig, they should both be defined'
                );
                return [false, null];
            }
            const visitedPlaces = odHelpers.getVisitedPlaces({ journey });
            const destination = odHelpers.getDestination({ visitedPlaces, trip });
            const activity = destination ? destination.activity : null;
            // FIXME Should this be true for any loop activity or just workOnTheRoad?
            return [activity !== 'workOnTheRoad', null];
        },
        validations: validations.requiredValidation
    };
};
