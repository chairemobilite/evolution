/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

// TODO Projects define server-side validations for fields. For now, we will use something similar to the client-side validation, for ease of use, but there should be a better way to do this, without having all validations in a single file
export type ServerValidation =
    | {
          [key: string]: {
              validations: {
                  validation: (fieldValue: any, interview: InterviewAttributes) => boolean;
                  errorMessage: { [key: string]: string };
              }[];
          };
      }
    | undefined;

/**
 * Validate the interview values with server side validations
 *
 * It returns either 'true' if everything is valid or a map of fields, where the
 * key is the name of the field and the value is the map of error messages for
 * the invalid field.
 *
 * @param {{ [key: string]: any }} valuesByPath
 * @param {string[]} _unsetValues
 * @return {*}  {Promise<{ [key: string]: { [key: string]: string } } |
 * boolean>}
 */
//TODO: Add functionality to the _unsetValues argument, or remove it.
const validate = async (
    interview: InterviewAttributes,
    serverValidations: ServerValidation,
    valuesByPath: { [key: string]: any },
    _unsetValues: string[]
): Promise<{ [key: string]: { [key: string]: string } } | true> => {
    if (!serverValidations) {
        return true;
    }

    const errors: { [key: string]: { [key: string]: string } } = {};
    const fieldsToValidate = Object.keys(serverValidations).filter(
        (key) =>
            valuesByPath['response.' + key] !== undefined &&
            (valuesByPath['validations.' + key] === undefined || valuesByPath['validations.' + key] === true)
    );
    for (let i = 0; i < fieldsToValidate.length; i++) {
        const key = fieldsToValidate[i];
        const validations = serverValidations[key].validations;
        const validationErrors = validations.filter((validation) =>
            validation.validation(valuesByPath['response.' + key], interview)
        );
        if (validationErrors.length !== 0) {
            errors[key] = validationErrors[0].errorMessage;
        }
    }

    return Object.keys(errors).length === 0 ? true : errors;
};

export default validate;
