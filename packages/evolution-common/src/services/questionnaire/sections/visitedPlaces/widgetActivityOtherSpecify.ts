/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getResponse } from '../../../../utils/helpers';
import type { TFunction } from 'i18next';
import type { WidgetConfig } from '../../../questionnaire/types';
import * as validations from '../../../widgets/validations/validations';
import type { WidgetFactoryOptions } from '../types';

/**
 * Text field shown when the respondent selects the catch-all `other` activity.
 * Hidden (and cleared) for any other activity.
 */
export const getActivityOtherSpecifyWidgetConfig = (_options: WidgetFactoryOptions): WidgetConfig => ({
    type: 'question',
    path: 'activityOtherSpecify',
    inputType: 'string',
    datatype: 'string',
    twoColumns: false,
    label: (t: TFunction) => t('visitedPlaces:visitedPlaceActivityOtherSpecify'),
    conditional: (interview, path) => {
        const activity = getResponse(interview, path, null, '../activity');
        return activity === 'other' ? [true, null] : [false, null];
    },
    validations: validations.requiredValidation
});
