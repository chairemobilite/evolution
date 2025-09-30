/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Route, Routes } from 'react-router';

import HomePage from '../pages/HomePage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import SurveyErrorPage from '../pages/SurveyErrorPage';
import AuthPage from '../pages/auth/AuthPage';
import SurveyUnavailablePage from '../pages/SurveyUnavailablePage';
import MagicLinkVerifyPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/MagicLinkVerify';
import CheckMagicEmailPage from 'chaire-lib-frontend/lib/components/forms/auth/passwordless/CheckMagicEmail';
import Survey from '../hoc/SurveyWithErrorBoundary';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import ConsentedRoute from './ConsentedRoute';
import { setShowUserInfoPerm } from 'chaire-lib-frontend/lib/actions/Auth';
import FloatingSupportForm from '../pageParts/FloatingSupportForm';

// Only show user info for users that are not simple respondents FIXME: do we still need this?
// Seems to be obsolete now that we differenciate between participant and admin routes
setShowUserInfoPerm({ Interviews: ['read', 'update'] });

const SurveyRouter: React.FunctionComponent = () => (
    <>
        <Routes>
            <Route path="/login" element={<ConsentedRoute component={AuthPage} />} />
            <Route path="/magic/verify" element={<PublicRoute component={MagicLinkVerifyPage} />} />
            <Route path="/checkMagicEmail" element={<PublicRoute component={CheckMagicEmailPage} />} />
            <Route path="/unauthorized" element={<PublicRoute component={UnauthorizedPage} />} />
            <Route path="/error" element={<PublicRoute component={SurveyErrorPage} />} />
            <Route path="/" element={<PublicRoute component={HomePage} />} />
            <Route path="/home" element={<PublicRoute component={HomePage} />} />
            <Route path="/unavailable" element={<PrivateRoute component={SurveyUnavailablePage} />} />
            <Route path="/survey/:sectionShortname" element={<PrivateRoute component={Survey} />} />
            <Route path="/survey" element={<PrivateRoute component={Survey} />} />
            <Route path="*" element={<PrivateRoute component={Survey} />} />
        </Routes>

        {/* Add the floating support form to be available on all pages */}
        <FloatingSupportForm />
    </>
);

export default SurveyRouter;
