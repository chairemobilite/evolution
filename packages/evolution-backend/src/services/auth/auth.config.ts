/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import configurePassport from 'chaire-lib-backend/lib/config/auth';
import { IAuthModel, IUserModel } from 'chaire-lib-backend/lib/services/auth/authModel';
import { PassportStatic } from 'passport';
import projectConfig from 'evolution-common/lib/config/project.config';
import byFieldLogin from './authByFieldLogin';

export default <U extends IUserModel>(authModel: IAuthModel<U>): PassportStatic => {
    // Configure passport with the auth model
    const passport = configurePassport<U>(authModel);

    if (projectConfig.auth.byField === true) {
        byFieldLogin(passport, authModel);
    }

    return passport;
};
