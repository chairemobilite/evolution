/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import HomePage from '../pages/HomePage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import SurveyErrorPage from '../pages/SurveyErrorPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterWithPasswordPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from 'chaire-lib-frontend/lib/components/pages/ForgotPasswordPage';
import MagicLinkVerifyPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/MagicLinkVerify';
import CheckMagicEmailPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/CheckMagicEmail';
import Survey from '../hoc/SurveyWithErrorBoundary';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import ResetPasswordPage from 'chaire-lib-frontend/lib/components/pages/ResetPasswordPage';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import ConsentedRoute from './ConsentedRoute';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { setShowUserInfoPerm } from 'chaire-lib-frontend/lib/actions/Auth';

// Only show user info for users that are not simple respondents FIXME: do we still need this?
// Seems to be obsolete now that we differenciate between participant and admin routes
setShowUserInfoPerm({ Interviews: ['read', 'update'] });

const localesString = `/:locale(${config.languages.join('|')})?`;

const SurveyRouter = () => (
    <Switch>
        <PublicRoute path="/" component={HomePage} exact={true} />
        <PublicRoute path={`${localesString}`} component={HomePage} exact={true} />
        <PublicRoute path="/home" component={HomePage} />
        <ConsentedRoute path="/register" component={RegisterWithPasswordPage} />
        <ConsentedRoute path="/login" component={LoginPage} />
        <PublicRoute path="/forgot" component={ForgotPasswordPage} />
        <PublicRoute path="/reset/:token" component={ResetPasswordPage} />
        <PublicRoute path="/unauthorized" component={UnauthorizedPage} />
        <PublicRoute path="/error" component={SurveyErrorPage} />
        <PublicRoute path="/magic/verify" component={MagicLinkVerifyPage} />
        <PublicRoute path="/checkMagicEmail" component={CheckMagicEmailPage} />
        <PrivateRoute path="/survey/:sectionShortname" component={Survey} componentProps={{}} />
        <PrivateRoute path="/survey" component={Survey} componentProps={{}} />
        <Route component={Survey} />
    </Switch>
);

export default SurveyRouter;
