/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { RouteObject } from 'react-router';

import HomePage from '../pages/HomePage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import SurveyErrorPage from '../pages/SurveyErrorPage';
import AuthPage from '../pages/auth/AuthPage';
import SurveyUnavailablePage from '../pages/SurveyUnavailablePage';
import NotFoundPage from '../pages/NotFoundPage';
import MagicLinkVerifyPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/MagicLinkVerify';
import CheckMagicEmailPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/CheckMagicEmail';
import Survey from '../hoc/SurveyWithErrorBoundary';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import ConsentedRoute from './ConsentedRoute';
import ParticipantRootLayout from './ParticipantRootLayout';

/**
 * Route configuration for participant survey application using React Router Data mode.
 * This function returns the routes to ensure components are properly instantiated.
 */
const getParticipantSurveyRoutes = (): RouteObject[] => [
    {
        element: <ParticipantRootLayout />,
        children: [
            {
                path: '/login',
                element: <ConsentedRoute component={AuthPage} path="/login" />
            },
            {
                path: '/magic/verify',
                element: <PublicRoute component={MagicLinkVerifyPage} path="/magic/verify" />
            },
            {
                path: '/checkMagicEmail',
                element: <PublicRoute component={CheckMagicEmailPage} path="/checkMagicEmail" />
            },
            {
                path: '/unauthorized',
                element: <PublicRoute component={UnauthorizedPage} path="/unauthorized" />
            },
            {
                path: '/error',
                element: <PublicRoute component={SurveyErrorPage} path="/error" />
            },
            {
                path: '/',
                element: <PublicRoute component={HomePage} path="/" />
            },
            {
                path: '/home',
                element: <PublicRoute component={HomePage} path="/home" />
            },
            {
                path: '/unavailable',
                element: <PrivateRoute component={SurveyUnavailablePage} path="/unavailable" />
            },
            {
                path: '/survey/:sectionShortname',
                element: <PrivateRoute component={Survey} path="/survey/:sectionShortname" />
            },
            {
                path: '/survey',
                element: <PrivateRoute component={Survey} path="/survey" />
            },
            {
                path: '/*',
                element: <PublicRoute component={NotFoundPage} path="/*" />
            }
        ]
    }
];

export default getParticipantSurveyRoutes;
