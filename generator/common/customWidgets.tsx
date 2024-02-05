/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TFunction } from 'i18next';
import { getI18nContext } from 'evolution-interviewer/lib/client/config/i18nextExtra.config';
import defaultConditional from 'evolution-common/lib/services/surveyGenerator/common/defaultConditional';
import * as inputTypes from 'evolution-common/lib/services/surveyGenerator/types/inputTypes';
import * as validations from './validations';

export const home_postalCode: inputTypes.InputString = {
    type: 'question',
    inputType: 'string',
    path: 'home.postalCode',
    datatype: 'string',
    twoColumns: false,
    textTransform: 'uppercase',
    containsHtml: true,
    label: (t: TFunction) => t('home:home.postalCode', { context: getI18nContext() }),
    validations: validations.postalCodeValidation,
    conditional: defaultConditional,
    inputFilter: (value) => {
        // Only accept postal code from Quebec
        return value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
    }
};
