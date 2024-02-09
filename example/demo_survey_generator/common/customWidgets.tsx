import { TFunction } from 'i18next';
import { defaultConditional } from 'generator/lib/common/defaultConditional';
import * as inputTypes from 'generator/lib/types/inputTypes';
import * as validations from "generator/lib/common/validations";

export const home_postalCode: inputTypes.InputString = {
    type: 'question',
    inputType: 'string',
    path: 'home.postalCode',
    datatype: 'string',
    twoColumns: false,
    textTransform: 'uppercase',
    containsHtml: true,
    label: (t: TFunction) => t('home:home.postalCode'),
    validations: validations.postalCodeValidation,
    conditional: defaultConditional,
    inputFilter: (value) => {
        // Only accept postal code from Quebec
        return value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6);
    }
};