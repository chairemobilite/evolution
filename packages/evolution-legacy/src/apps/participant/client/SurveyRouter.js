/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import HomePage from '../../../components/survey/HomePage';
import NotFoundPage from 'chaire-lib-frontend/lib/components/pages/NotFoundPage';
import UnauthorizedPage from 'evolution-frontend/lib/components/pages/UnauthorizedPage';
import SurveyErrorPage from 'evolution-frontend/lib/components/pages/SurveyErrorPage';
import LoginPage from 'evolution-frontend/lib/components/pages/auth/LoginPage';
import RegisterWithPasswordPage from 'evolution-frontend/lib/components/pages/auth/RegisterPage';
import ForgotPasswordPage from 'chaire-lib-frontend/lib/components/pages/ForgotPasswordPage';
import MagicLinkVerifyPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/MagicLinkVerify';
import CheckMagicEmailPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/CheckMagicEmail';
import Survey from '../../../components/survey/Survey';
//import RegistrationCompleted from '../../components/survey/RegistrationCompleted';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import ResetPasswordPage from 'chaire-lib-frontend/lib/components/pages/ResetPasswordPage';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import ConsentedRoute from 'evolution-frontend/lib/components/routers/ConsentedRoute';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import ConsentFormPage from '../../../components/survey/ConsentFormPage';
import { setShowUserInfoPerm } from 'chaire-lib-frontend/lib/actions/Auth';

// Only show user info for users that are not simple respondents
setShowUserInfoPerm({ 'Interviews': ['read', 'update'] });

const localesString = `/:locale(${config.languages.join('|')})?`;

const SurveyRouter = () => (
  <Switch>
    <PublicRoute   path="/" component={HomePage} exact={true} />
    <PublicRoute   path={`${localesString}`} component={HomePage} exact={true} />
    <PublicRoute   path="/home" component={HomePage} />
    <ConsentedRoute   path="/register" component={RegisterWithPasswordPage} />
    <ConsentedRoute   path="/login" component={LoginPage} />
    <PublicRoute   path="/forgot" component={ForgotPasswordPage} />
    <PublicRoute   path="/reset/:token" component={ResetPasswordPage} />
    <PublicRoute   path="/consent_form" component={config.consentFormPage === true ? ConsentFormPage : NotFoundPage}/>
    <PublicRoute   path="/unauthorized" component={UnauthorizedPage} />
    <PublicRoute   path="/error" component={SurveyErrorPage} />
    <PublicRoute   path="/magic/verify" component={MagicLinkVerifyPage} />
    <PublicRoute   path="/checkMagicEmail" component={CheckMagicEmailPage} />
    <PrivateRoute  path="/survey/:sectionShortname" component={Survey} />
    <PrivateRoute  path="/survey" component={Survey} />
    <Route         component={Survey} />
  </Switch>
);

export default SurveyRouter;