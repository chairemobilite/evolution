/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { RouteObject } from 'react-router';
import { render } from '@testing-library/react';
import getAdminSurveyRoutes from '../AdminSurveyRouter';

// Mock the components since we're testing route configuration, not component rendering
jest.mock('../AdminRootLayout', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminRootLayout')
}));

jest.mock('chaire-lib-frontend/lib/components/routers/PrivateRoute', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'PrivateRoute')
}));

jest.mock('chaire-lib-frontend/lib/components/routers/PublicRoute', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'PublicRoute')
}));

jest.mock('chaire-lib-frontend/lib/components/routers/AdminRoute', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminRoute')
}));

// Mock page components
jest.mock('../../pages/AdminMonitoringPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminMonitoringPage')
}));

jest.mock('../../pages/ReviewPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminReviewPage')
}));

jest.mock('../../pages/SurveyCorrection', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminSurveyCorrectionPage')
}));

jest.mock('../../pages/RespondentBehaviorPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminRespondentBehaviorPage')
}));

jest.mock('../../../pages/SurveyUnavailablePage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'SurveyUnavailablePage')
}));

jest.mock('../../../pages/NotFoundPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'NotFoundPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/UnauthorizedPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'UnauthorizedPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/MaintenancePage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'MaintenancePage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages', () => ({
    LoginPage: () => React.createElement('div', null, 'AdminLoginPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/RegisterPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminRegisterPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/ForgotPasswordPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'ForgotPasswordPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/VerifyPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'VerifyPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/ResetPasswordPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'ResetPasswordPage')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/UnconfirmedPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'UnconfirmedPage')
}));

jest.mock('../../../hoc/SurveyWithErrorBoundary', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'Survey')
}));

jest.mock('chaire-lib-frontend/lib/components/pages/admin/UsersPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'UsersPage')
}));

jest.mock('../../interviews/InterviewsByAccessCode', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'InterviewsByAccessCode')
}));

jest.mock('../../pages/InterviewsPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'InterviewsPage')
}));

jest.mock('../../pages/AdminHomePage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AdminHomePage')
}));

// Mock config
jest.mock('chaire-lib-common/lib/config/shared/project.config', () => ({
    __esModule: true,
    default: {
        auth: {},
        mapDefaultCenter: { lon: -73.6131, lat: 45.5041 }
    }
}));

describe('getAdminSurveyRoutes', () => {
    let routes: RouteObject[];

    beforeEach(() => {
        routes = getAdminSurveyRoutes();
    });

    it('should return a valid route configuration with root layout and children', () => {
        expect(Array.isArray(routes)).toBe(true);
        expect(routes.length).toBe(1);

        const rootRoute = routes[0];
        expect(rootRoute.element).toBeDefined();
        expect(rootRoute.children).toBeDefined();
        expect(Array.isArray(rootRoute.children)).toBe(true);
        expect(React.isValidElement(rootRoute.element)).toBe(true);
    });

    it('should include all expected routes with correct paths', () => {
        const rootRoute = routes[0];
        const children = rootRoute.children || [];
        const paths = children.map((child) => child.path);

        const expectedRoutes = [
            '/',
            '/login',
            '/register',
            '/forgot',
            '/unconfirmed',
            '/verify/:token',
            '/reset/:token',
            '/unauthorized',
            '/maintenance',
            '/survey/edit/:uuid',
            '/survey/edit/:uuid/:sectionShortname',
            '/admin/survey/:sectionShortname',
            '/admin/survey/interview/:interviewUuid',
            '/interviews/byCode/:accessCode',
            '/interviews/byCode',
            '/interviews',
            '/admin/monitoring',
            '/admin/respondent-behavior',
            '/admin/validation',
            '/admin/users',
            '/admin',
            '/home',
            '/unavailable',
            '/*'
        ];

        expectedRoutes.forEach((expectedPath) => {
            expect(paths).toContain(expectedPath);
        });
        expect(children.length).toBe(expectedRoutes.length);
    });

    it('should have valid RouteObject structure for all routes', () => {
        const rootRoute = routes[0];
        const children = rootRoute.children || [];

        children.forEach((child) => {
            expect(child).toHaveProperty('path');
            expect(child).toHaveProperty('element');
            expect(typeof child.path).toBe('string');
            expect(React.isValidElement(child.element)).toBe(true);
        });
    });

    it('should use correct route wrappers (PrivateRoute, PublicRoute, AdminRoute) for each route', () => {
        const rootRoute = routes[0];
        const children = rootRoute.children || [];

        const getWrapperType = (path: string): string => {
            const route = children.find((child) => child.path === path);
            if (!route || !route.element) return 'Unknown';

            // Render the element and check the output
            const { container, unmount } = render(route.element as React.ReactElement);
            const textContent = container.textContent || '';

            // Clean up the render before returning to avoid memory leaks
            unmount();

            if (textContent.includes('AdminRoute')) return 'AdminRoute';
            if (textContent.includes('PrivateRoute')) return 'PrivateRoute';
            if (textContent.includes('PublicRoute')) return 'PublicRoute';
            return 'Unknown';
        };

        // Verify PublicRoute is used for public routes
        expect(getWrapperType('/')).toBe('PublicRoute');
        expect(getWrapperType('/login')).toBe('PublicRoute');
        expect(getWrapperType('/register')).toBe('PublicRoute');
        expect(getWrapperType('/forgot')).toBe('PublicRoute');
        expect(getWrapperType('/unconfirmed')).toBe('PublicRoute');
        expect(getWrapperType('/verify/:token')).toBe('PublicRoute');
        expect(getWrapperType('/reset/:token')).toBe('PublicRoute');
        expect(getWrapperType('/unauthorized')).toBe('PublicRoute');
        expect(getWrapperType('/maintenance')).toBe('PublicRoute');
        expect(getWrapperType('/*')).toBe('PublicRoute');

        // Verify PrivateRoute is used for protected routes
        expect(getWrapperType('/survey/edit/:uuid')).toBe('PrivateRoute');
        expect(getWrapperType('/survey/edit/:uuid/:sectionShortname')).toBe('PrivateRoute');
        expect(getWrapperType('/admin/survey/:sectionShortname')).toBe('PrivateRoute');
        expect(getWrapperType('/admin/survey/interview/:interviewUuid')).toBe('PrivateRoute');
        expect(getWrapperType('/interviews/byCode/:accessCode')).toBe('PrivateRoute');
        expect(getWrapperType('/interviews/byCode')).toBe('PrivateRoute');
        expect(getWrapperType('/interviews')).toBe('PrivateRoute');
        expect(getWrapperType('/admin/validation')).toBe('PrivateRoute');
        expect(getWrapperType('/home')).toBe('PrivateRoute');
        expect(getWrapperType('/unavailable')).toBe('PrivateRoute');

        // Verify AdminRoute is used for admin routes
        expect(getWrapperType('/admin/monitoring')).toBe('AdminRoute');
        expect(getWrapperType('/admin/respondent-behavior')).toBe('AdminRoute');
        expect(getWrapperType('/admin/users')).toBe('AdminRoute');
        expect(getWrapperType('/admin')).toBe('AdminRoute');
    });
});
