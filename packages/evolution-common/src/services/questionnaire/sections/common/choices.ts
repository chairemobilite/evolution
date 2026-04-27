/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { TFunction } from 'i18next';

/**
 * Common yes/no choices for radio buttons in the questionnaire. The label is
 * translated using the "survey:Yes" and "survey:No" keys.
 */
export const yesNoChoices = [
    {
        value: true,
        label: (t: TFunction) => t('survey:Yes')
    },
    {
        value: false,
        label: (t: TFunction) => t('survey:No')
    }
];
