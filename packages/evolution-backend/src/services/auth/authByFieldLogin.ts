/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Request } from 'express';
import { PassportStatic } from 'passport';
import LocalStrategy from 'passport-local';
import { IAuthModel, IUserModel } from 'chaire-lib-backend/lib/services/auth/authModel';
import { validateAccessCode } from '../accessCode';
import interviewsPreFillQueries from '../../models/interviewsPreFill.db.queries';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { getPostalCodeRegex } from 'evolution-common/lib/services/widgets/validations/validations';

// Validate postal code
const validatePostalCode = (postalCode: string): boolean => {
    if (!postalCode) {
        return false;
    }
    // Validate the postal code with the regex for the configured region
    if (!getPostalCodeRegex().test(postalCode)) {
        return false;
    }

    return true;
};

/**
 * A login method that matches a combination of fields that are set in the
 * prefilled responses to log into an interview. It uses one field as username
 * and another as password.
 *
 * There are 3 cases:
 *
 * 1. A user already exists with the field combination, the user is logged in
 *    with this data.
 * 2. A pre-filled response exists with the field combination, a new user is
 *    created with this data.
 * 3. No user or pre-filled response exists, the user is prompted to confirm
 *    that the field combination is correct. If the user confirms, a new user is
 *    created with this data.
 *
 * TODO Allow to parameterize the fields to use instead of hard-coding access
 * code and postal code
 */
export default <U extends IUserModel>(passport: PassportStatic, authModel: IAuthModel<U>) => {
    passport.use(
        'auth-by-field',
        new LocalStrategy.Strategy(
            {
                // It is not actually username/password fields, but we use the local strategy's constructor to separate the 2 required fields for our callback
                usernameField: 'accessCode',
                passwordField: 'postalCode',
                passReqToCallback: true
            },
            async (
                req: Request,
                accessCodeQuery: string,
                postalCodeQuery: string,
                done: (error: any, user?: any, options?: LocalStrategy.IVerifyOptions) => void
            ) => {
                try {
                    // Convert all to upper case
                    const accessCode = accessCodeQuery.trim().toUpperCase();
                    const postalCode = postalCodeQuery.trim().toUpperCase();

                    // Validate access code and postal code
                    if (!validateAccessCode(accessCode) || !validatePostalCode(postalCode)) {
                        return done('InvalidData', false);
                    }

                    // Username is the combination of access code and postal
                    // code. With only access code, we could have duplicate
                    // usernames if somebody enters the wrong access code and
                    // the actual participant with this access code later comes
                    // to fill the survey
                    const username = `${accessCode}-${postalCode}`;

                    // First, try to find a user with matching credentials in the auth model
                    const user = await authModel.find({ username });

                    if (user !== undefined) {
                        user.recordLogin();
                        return done(null, user.sanitize());
                    }

                    // If no user found, check if there's a pre-filled response
                    // Use the combination of accessCode and postalCode as reference
                    const prefillData = await interviewsPreFillQueries.getByReferenceValue(accessCode);

                    const userConfirmedOk = req.body.confirmCredentials === true;

                    if (prefillData !== undefined || userConfirmedOk) {
                        const preFilledPostalCode = prefillData?.['home.postalCode']?.value;
                        if (preFilledPostalCode === postalCode || userConfirmedOk) {
                            // Found matching prefill data or the user confirmed the pair is as expected, create a new user
                            const newUser = await authModel.createAndSave({
                                username
                            });

                            if (newUser !== null) {
                                newUser.recordLogin();
                                return done(null, newUser.sanitize());
                            } else {
                                return done('FailedToCreateUser', false);
                            }
                        }
                    }

                    // No match found anywhere, return a warning that the user may confirm
                    return done('FieldCombinationNotFound', false);
                } catch (error) {
                    console.error(`Error authenticating with access code and postal code: ${error}`);
                    if (TrError.isTrError(error)) {
                        return done(error.export().localizedMessage, false);
                    }
                    return done('FailedToCreateUser', false);
                }
            }
        )
    );
};
