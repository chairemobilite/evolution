/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { RouteObject } from 'react-router';

import AdminMonitoringPage from '../pages/AdminMonitoringPage';
import AdminReviewPage from '../pages/ReviewPage';
import AdminSurveyCorrectionPage from '../pages/SurveyCorrection';
import AdminRespondentBehaviorPage from '../pages/RespondentBehaviorPage';
import SurveyUnavailablePage from '../../pages/SurveyUnavailablePage';
import NotFoundPage from '../../pages/NotFoundPage';
import UnauthorizedPage from 'chaire-lib-frontend/lib/components/pages/UnauthorizedPage';
import MaintenancePage from 'chaire-lib-frontend/lib/components/pages/MaintenancePage';
import { LoginPage as AdminLoginPage } from 'chaire-lib-frontend/lib/components/pages';
import AdminRegisterPage from 'chaire-lib-frontend/lib/components/pages/RegisterPage';
import ForgotPasswordPage from 'chaire-lib-frontend/lib/components/pages/ForgotPasswordPage';
import VerifyPage from 'chaire-lib-frontend/lib/components/pages/VerifyPage';
import Survey from '../../hoc/SurveyWithErrorBoundary';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import ResetPasswordPage from 'chaire-lib-frontend/lib/components/pages/ResetPasswordPage';
import UnconfirmedPage from 'chaire-lib-frontend/lib/components/pages/UnconfirmedPage';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import AdminRoute from 'chaire-lib-frontend/lib/components/routers/AdminRoute';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import UsersPage from 'chaire-lib-frontend/lib/components/pages/admin/UsersPage';
import InterviewsByAccessCode from '../interviews/InterviewsByAccessCode';
import InterviewsPage from '../pages/InterviewsPage';
import { setShowUserInfoPerm } from 'chaire-lib-frontend/lib/actions/Auth';
import AdminHomePage from '../pages/AdminHomePage';
import AdminRootLayout from './AdminRootLayout';

// Only show user info for users that are not simple respondents
setShowUserInfoPerm({ Interviews: ['read', 'update'] });

// FIXME This should be done at another level, using the `setProjectConfiguration`
config.auth = {
    localLogin: {
        allowRegistration: true,
        forgotPasswordPage: true,
        registerWithEmailOnly: true,
        confirmEmail: true,
        confirmEmailStrategy: 'confirmByAdmin'
    }
};

/**
 * Route configuration for admin survey application using React Router Data mode.
 * This function returns the routes to ensure components are properly instantiated.
 */
const getAdminSurveyRoutes = (): RouteObject[] => [
    {
        element: <AdminRootLayout />,
        children: [
            {
                path: '/',
                element: <PublicRoute component={AdminLoginPage} path="/" />
            },
            {
                path: '/login',
                element: <PublicRoute component={AdminLoginPage} path="/login" />
            },
            {
                path: '/register',
                element: <PublicRoute component={AdminRegisterPage} path="/register" />
            },
            {
                path: '/forgot',
                element: <PublicRoute component={ForgotPasswordPage} path="/forgot" />
            },
            {
                path: '/unconfirmed',
                element: <PublicRoute component={UnconfirmedPage} path="/unconfirmed" />
            },
            {
                path: '/verify/:token',
                element: <PublicRoute component={VerifyPage} path="/verify/:token" />
            },
            {
                path: '/reset/:token',
                element: <PublicRoute component={ResetPasswordPage} path="/reset/:token" />
            },
            {
                path: '/unauthorized',
                element: <PublicRoute component={UnauthorizedPage} path="/unauthorized" />
            },
            {
                path: '/maintenance',
                element: (
                    <PublicRoute
                        component={MaintenancePage}
                        componentProps={{ linkPath: '/survey' }}
                        path="/maintenance"
                    />
                )
            },
            {
                path: '/survey/edit/:uuid',
                element: (
                    <PrivateRoute
                        component={Survey}
                        permissions={{ Interviews: ['read', 'update'] }}
                        path="/survey/edit/:uuid"
                    />
                )
            },
            {
                path: '/survey/edit/:uuid/:sectionShortname',
                element: (
                    <PrivateRoute
                        component={Survey}
                        permissions={{ Interviews: ['read', 'update'] }}
                        path="/survey/edit/:uuid/:sectionShortname"
                    />
                )
            },
            {
                path: '/admin/survey/:sectionShortname',
                element: (
                    <PrivateRoute
                        component={AdminSurveyCorrectionPage}
                        permissions={{ Interviews: ['validate'] }}
                        path="/admin/survey/:sectionShortname"
                    />
                )
            },
            {
                path: '/admin/survey/interview/:interviewUuid',
                element: (
                    <PrivateRoute
                        component={AdminSurveyCorrectionPage}
                        permissions={{ Interviews: ['validate'] }}
                        path="/admin/survey/interview/:interviewUuid"
                    />
                )
            },
            {
                path: '/interviews/byCode/:accessCode',
                element: (
                    <PrivateRoute
                        component={InterviewsByAccessCode}
                        permissions={{ Interviews: ['read', 'update'] }}
                        path="/interviews/byCode/:accessCode"
                    />
                )
            },
            {
                path: '/interviews/byCode',
                element: (
                    <PrivateRoute
                        component={InterviewsByAccessCode}
                        permissions={{ Interviews: ['read', 'update'] }}
                        path="/interviews/byCode"
                    />
                )
            },
            {
                path: '/interviews',
                element: (
                    <PrivateRoute
                        component={InterviewsPage}
                        permissions={{ Interviews: ['read', 'update'] }}
                        path="/interviews"
                    />
                )
            },
            {
                path: '/admin/monitoring',
                element: <AdminRoute component={AdminMonitoringPage} path="/admin/monitoring" />
            },
            {
                path: '/admin/respondent-behavior',
                element: <AdminRoute component={AdminRespondentBehaviorPage} path="/admin/respondent-behavior" />
            },
            {
                path: '/admin/validation',
                element: (
                    <PrivateRoute
                        component={AdminReviewPage}
                        permissions={{ Interviews: ['validate'] }}
                        path="/admin/validation"
                    />
                )
            },
            {
                path: '/admin/users',
                element: <AdminRoute component={UsersPage} path="/admin/users" />
            },
            {
                path: '/admin',
                element: <AdminRoute component={AdminMonitoringPage} path="/admin" />
            },
            {
                path: '/home',
                element: <PrivateRoute component={AdminHomePage} path="/home" />
            },
            {
                path: '/unavailable',
                element: <PrivateRoute component={SurveyUnavailablePage} path="/unavailable" />
            },
            {
                path: '*',
                element: <PublicRoute component={NotFoundPage} path="*" />
            }
        ]
    }
];

export default getAdminSurveyRoutes;
