/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';

import config from '../../../../config/project.config';
import * as odHelpers from '../../../odSurvey/helpers';
import { ButtonWidgetConfig, UserInterviewAttributes } from '../../types';

/**
 * Get the confirm popup to add to the button that leaves the household section,
 * so the respondent cannot go further when nobody in the household reaches
 * `config.ages.householdMinimumAge`. The popup
 * only has a dismiss button: the respondent stays in the household section and
 * can correct the ages.
 *
 * The household section is not a builtin section, so each survey has to add
 * this popup to its own button, for example: `{ ...buttonConfig, confirmPopup:
 * getHouseholdMinimumAgeConfirmPopup() }`.
 *
 * @returns {ButtonWidgetConfig['confirmPopup']} The confirm popup configuration
 */
export const getHouseholdMinimumAgeConfirmPopup = (): ButtonWidgetConfig['confirmPopup'] => ({
    content: (t: TFunction, interview: UserInterviewAttributes) =>
        t('survey:errors:householdMinimumAge', {
            count: odHelpers.countPersons({ interview }),
            age: config.ages.householdMinimumAge
        }),
    showConfirmButton: false,
    cancelButtonColor: 'blue',
    cancelButtonLabel: (t: TFunction) => t('main:OK'),
    conditional: (interview) => !odHelpers.hasHouseholdMemberOfMinimumAge({ interview })
});
