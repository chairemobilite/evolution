/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { PassportStatic } from 'passport';
import configurePassport from 'chaire-lib-backend/lib/config/auth';
import { IAuthModel, IUserModel } from 'chaire-lib-backend/lib/services/auth/authModel';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import projectConfig from 'evolution-common/lib/config/project.config';
import byFieldLogin from './authByFieldLogin';

export default <U extends IUserModel>(authModel: IAuthModel<U>): PassportStatic => {
    // Configure passport with the auth model
    const passport = configurePassport<U>(authModel);

    if (!_isBlank(projectConfig.auth.byField) && projectConfig.auth.byField !== false) {
        byFieldLogin(passport, authModel);
    }

    return passport;
};
