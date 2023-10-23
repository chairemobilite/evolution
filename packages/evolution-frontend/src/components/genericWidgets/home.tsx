import { TFunction } from 'i18next';
import { getI18nContext } from 'evolution-interviewer/lib/client/config/i18nextExtra.config';
import { _isBlank, _isEmail } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const accessCode: any = {
    type: 'question',
    twoColumns: true,
    path: 'accessCode',
    inputType: 'string',
    datatype: 'string',
    containsHtml: true,
    inputFilter: (input: string) => {
        input = input.replace("_", "-"); // change _ to -
        input = input.replace(/[^-\d]/g, ''); // Remove everything but numbers and -
        // Get only the digits. If we have 8, we can automatically format the access code.
        const digits = input.replace(/\D+/g, '');
        if (digits.length === 8) {
            return digits.slice(0, 4) + "-" + digits.slice(4);
        }
        // Prevent entering more than 9 characters (8 digits for access code and a dash)
        return input.slice(0, 9);
    },
    numericKeyboard: true,
    label: (t: TFunction) => t('genericWidgets:home:AccessCode', { context: getI18nContext() }),
    validations: function (value, customValue, interview, path, customPath) {
        return [
            {
                validation: _isBlank(value),
                errorMessage: (t: TFunction) => t('genericWidgets:home:AccessCodeRequiredError')
            }
        ];
    }
};

export const contactEmail = {
    type: 'question',
    path: 'contactEmail',
    inputType: 'string',
    datatype: 'string',
    containsHtml: true,
    twoColumns: true,
    inputFilter: (input: string) => input.replaceAll(" ", ""), // Do not allow spaces
    defaultValue: function (interview, path, user) {
        return !_isBlank(user) && !_isBlank(user.email) && interview.participant_id === user.id
            ? user.email
            : undefined;
    },
    label: (t: TFunction) => t('genericWidgets:home:ContactEmail', { context: getI18nContext() }),
    validations: function (value) {
        return [
            contactEmailInvalidAddressValidation(value),
        ];
    }
};

export const contactEmailInvalidAddressValidation = function(value: string) {
    return {
        validation: !_isBlank(value) && !_isEmail(value),
        errorMessage: (t: TFunction) => t('genericWidgets:home:ContactEmailInvalidAddressError')
    }
}
