/*
 * Copyright Polytechnique Montreal and contributors
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
 * Text field shown when the respondent selects the catch-all `other` mode.
 * Hidden (and cleared) for any other mode.
 */
export const getModeOtherSpecifyWidgetConfig = (_options: WidgetFactoryOptions): WidgetConfig => ({
    type: 'question',
    path: 'modeOtherSpecify',
    inputType: 'string',
    datatype: 'string',
    twoColumns: false,
    label: (t: TFunction) => t('segments:segmentModeOtherSpecify'),
    conditional: (interview, path) => {
        const mode = getResponse(interview, path, null, '../mode');
        return mode === 'other' ? [true, null] : [false, null];
    },
    validations: validations.requiredValidation
});
