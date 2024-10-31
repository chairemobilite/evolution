/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Switch } from 'react-router-dom';

import AdminMonitoringPageContainer from 'evolution-frontend/lib/components/admin/monitoring/AdminMonitoringPageContainer';
import AdminExportPage from 'evolution-frontend/lib/components/admin/export/AdminExportPage';
import AdminValidationPage from '../../../components/shared/AdminValidationPage';
import AdminValidateSurveyPage from '../../../components/shared/AdminValidateSurveyPage';
import UnauthorizedPage from 'chaire-lib-frontend/lib/components/pages/UnauthorizedPage';
import MaintenancePage from 'chaire-lib-frontend/lib/components/pages/MaintenancePage';
import { LoginPage as AdminLoginPage } from 'chaire-lib-frontend/lib/components/pages';
import AdminRegisterPage from 'chaire-lib-frontend/lib/components/pages/RegisterPage';
import ForgotPasswordPage from 'chaire-lib-frontend/lib/components/pages/ForgotPasswordPage';
import MagicLinkVerifyPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/MagicLinkVerify';
import CheckMagicEmailPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/CheckMagicEmail';
import Survey from 'evolution-frontend/lib/components/hoc/SurveyWithErrorBoundary';
//import RegistrationCompleted from '../../components/survey/RegistrationCompleted';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import ResetPasswordPage from 'chaire-lib-frontend/lib/components/pages/ResetPasswordPage';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import AdminRoute from 'chaire-lib-frontend/lib/components/routers/AdminRoute';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import UsersPage from 'chaire-lib-frontend/lib/components/pages/admin/UsersPage';
import InterviewsByAccessCode from 'evolution-frontend/lib/components/admin/review/InterviewsByAccessCode';
import InterviewsPage from 'evolution-frontend/lib/components/admin/review/InterviewsPage';
import { setShowUserInfoPerm } from 'chaire-lib-frontend/lib/actions/Auth';
import AdminHomePage from 'evolution-frontend/lib/components/admin/pages/AdminHomePage';

// Only show user info for users that are not simple respondents
setShowUserInfoPerm({ 'Interviews': ['read', 'update'] });

const localesString = `/:locale(${config.languages.join('|')})?`;
const adminLoginConfig = {
    auth: {
        localLogin: {
            allowRegistration: true,
            forgotPasswordPage: true,
            registerWithEmailOnly: true,
            confirmEmail: true,
            confirmEmailStrategy: 'confirmByAdmin'
        }
    }
};

const SurveyRouter = () => (
  <Switch>
    <PublicRoute   path="/" component={AdminLoginPage} config={adminLoginConfig} exact={true} />
    <PublicRoute   path={`${localesString}`} component={AdminLoginPage} exact={true} />
    <PublicRoute   path="/login" component={AdminLoginPage} config={adminLoginConfig}/>
    <PublicRoute   path="/register" component={AdminRegisterPage} config={adminLoginConfig}/>
    <PublicRoute   path="/forgot" component={ForgotPasswordPage} />
    <PublicRoute   path="/reset/:token" component={ResetPasswordPage} />
    <PublicRoute   path="/unauthorized" component={UnauthorizedPage} />
    <PublicRoute   path="/maintenance" component={() => <MaintenancePage linkPath={'/survey'}/>} />
    <PublicRoute   path="/magic/verify" component={MagicLinkVerifyPage} />
    <PublicRoute   path="/checkMagicEmail" component={CheckMagicEmailPage} />
    <PrivateRoute  path="/survey/edit/:uuid" permissions={{ 'Interviews': ['read', 'update'] }} component={Survey} />
    <PrivateRoute  path="/survey/edit/:uuid/:sectionShortname" permissions={{ 'Interviews': ['read', 'update'] }} component={Survey} />
    <PrivateRoute  path="/admin/survey/:sectionShortname" permissions={{ 'Interviews': ['validate'] }} component={AdminValidateSurveyPage} exact={true} />
    <PrivateRoute  path="/admin/survey/interview/:interviewUuid" permissions={{ 'Interviews': ['validate'] }} component={AdminValidateSurveyPage} exact={true} />
    <PrivateRoute  path="/interviews/byCode/:accessCode" permissions={{ 'Interviews': ['read', 'update'] }} component={InterviewsByAccessCode} exact={true} />
    <PrivateRoute  path="/interviews/byCode" permissions={{ 'Interviews': ['read', 'update'] }} component={InterviewsByAccessCode} exact={true} />
    <PrivateRoute  path="/interviews" permissions={{ 'Interviews': ['read', 'update'] }} component={InterviewsPage} exact={false} />
    <AdminRoute    path="/admin/monitoring" component={AdminMonitoringPageContainer} />
    <PrivateRoute  path="/admin/validation" permissions={{ 'Interviews': ['validate'] }} component={AdminValidationPage} />
    <AdminRoute    path="/admin/users" component={UsersPage} exact={true} />
    <AdminRoute    path="/admin/export" component={AdminExportPage} exact={true} />
    <AdminRoute    path="/admin" component={AdminHomePage} exact={true} />
    <PrivateRoute  path="/home" component={AdminHomePage} />
    <PrivateRoute  component={AdminHomePage} />
  </Switch>
);

export default SurveyRouter