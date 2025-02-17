/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Route, Routes } from 'react-router';

import AdminMonitoringPage from 'evolution-frontend/lib/components/admin/pages/AdminMonitoringPage';
import AdminValidationPage from '../../../components/admin/Validation';
import AdminValidateSurveyPage from 'evolution-frontend/lib/components/admin/pages/ValidateSurvey';
import UnauthorizedPage from 'chaire-lib-frontend/lib/components/pages/UnauthorizedPage';
import MaintenancePage from 'chaire-lib-frontend/lib/components/pages/MaintenancePage';
import { LoginPage as AdminLoginPage } from 'chaire-lib-frontend/lib/components/pages';
import AdminRegisterPage from 'chaire-lib-frontend/lib/components/pages/RegisterPage';
import ForgotPasswordPage from 'chaire-lib-frontend/lib/components/pages/ForgotPasswordPage';
import Survey from 'evolution-frontend/lib/components/hoc/SurveyWithErrorBoundary';
//import RegistrationCompleted from '../../components/survey/RegistrationCompleted';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import ResetPasswordPage from 'chaire-lib-frontend/lib/components/pages/ResetPasswordPage';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import AdminRoute from 'chaire-lib-frontend/lib/components/routers/AdminRoute';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import UsersPage from 'chaire-lib-frontend/lib/components/pages/admin/UsersPage';
import InterviewsByAccessCode from 'evolution-frontend/lib/components/admin/interviews/InterviewsByAccessCode';
import InterviewsPage from 'evolution-frontend/lib/components/admin/pages/InterviewsPage';
import { setShowUserInfoPerm } from 'chaire-lib-frontend/lib/actions/Auth';
import AdminHomePage from 'evolution-frontend/lib/components/admin/pages/AdminHomePage';

// Only show user info for users that are not simple respondents
setShowUserInfoPerm({ 'Interviews': ['read', 'update'] });

// FIXME This should be done at another level, using the `setProjec
config.auth = {
    localLogin: {
        allowRegistration: true,
        forgotPasswordPage: true,
        registerWithEmailOnly: true,
        confirmEmail: true,
        confirmEmailStrategy: 'confirmByAdmin'
    }
};

const SurveyRouter = () => (
    <Routes>
        <Route path="/" element={<PublicRoute component={AdminLoginPage} />} />
        <Route path="/login" element={<PublicRoute component={AdminLoginPage} />} />
        <Route path="/register" element={<PublicRoute component={AdminRegisterPage} />} />
        <Route path="/forgot" element={<PublicRoute component={ForgotPasswordPage} />} />
        <Route path="/reset/:token" element={<PublicRoute component={ResetPasswordPage} />} />
        <Route path="/unauthorized" element={<PublicRoute component={UnauthorizedPage} />} />
        <Route path="/maintenance" element={<PublicRoute component={MaintenancePage} componentProps={{ linkPath: '/survey' }}/>} />
        <Route path="/survey/edit/:uuid" element={<PrivateRoute component={Survey} permissions={{ 'Interviews': ['read', 'update'] }} />} />
        <Route path="/survey/edit/:uuid/:sectionShortname" element={<PrivateRoute component={Survey} permissions={{ 'Interviews': ['read', 'update'] }} />} />
        <Route path="/admin/survey/:sectionShortname" element={<PrivateRoute component={AdminValidateSurveyPage} permissions={{ 'Interviews': ['validate'] }} />} />
        <Route path="/admin/survey/interview/:interviewUuid" element={<PrivateRoute component={AdminValidateSurveyPage} permissions={{ 'Interviews': ['validate'] }} />} />
        <Route path="/interviews/byCode/:accessCode" element={<PrivateRoute component={InterviewsByAccessCode} permissions={{ 'Interviews': ['read', 'update'] }} />} />
        <Route path="/interviews/byCode" element={<PrivateRoute component={InterviewsByAccessCode} permissions={{ 'Interviews': ['read', 'update'] }} />} />
        <Route path="/interviews" element={<PrivateRoute component={InterviewsPage} permissions={{ 'Interviews': ['read', 'update'] }} />} />
        <Route path="/admin/monitoring" element={<AdminRoute component={AdminMonitoringPage} />} />
        <Route path="/admin/validation" element={<PrivateRoute component={AdminValidationPage} permissions={{ 'Interviews': ['validate'] }} />} />
        <Route path="/admin/users" element={<AdminRoute component={UsersPage} />} />
        <Route path="/admin" element={<AdminRoute component={AdminMonitoringPage} />} />
        <Route path="/home" element={<PrivateRoute component={AdminHomePage} />} />
        <Route path="*" element={<PrivateRoute component={AdminHomePage} />} />
    </Routes>
);

export default SurveyRouter