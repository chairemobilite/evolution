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

    it('Should return a valid route configuration with root layout and children', () => {
        expect(Array.isArray(routes)).toBe(true);
        expect(routes.length).toBe(1);

        const rootRoute = routes[0];
        expect(rootRoute.element).toBeDefined();
        expect(rootRoute.children).toBeDefined();
        expect(Array.isArray(rootRoute.children)).toBe(true);
        expect(React.isValidElement(rootRoute.element)).toBe(true);
    });

    it('Should have valid RouteObject structure for all routes', () => {
        const rootRoute = routes[0];
        const children = rootRoute.children || [];

        children.forEach((child) => {
            expect(child).toHaveProperty('path');
            expect(child).toHaveProperty('element');
            expect(typeof child.path).toBe('string');
            expect(React.isValidElement(child.element)).toBe(true);
        });
    });

    const expectedRoutes: Array<{ path: string; wrapperType: 'PublicRoute' | 'PrivateRoute' | 'AdminRoute' }> = [
        { path: '/', wrapperType: 'PublicRoute' },
        { path: '/login', wrapperType: 'PublicRoute' },
        { path: '/register', wrapperType: 'PublicRoute' },
        { path: '/forgot', wrapperType: 'PublicRoute' },
        { path: '/unconfirmed', wrapperType: 'PublicRoute' },
        { path: '/verify/:token', wrapperType: 'PublicRoute' },
        { path: '/reset/:token', wrapperType: 'PublicRoute' },
        { path: '/unauthorized', wrapperType: 'PublicRoute' },
        { path: '/maintenance', wrapperType: 'PublicRoute' },
        { path: '/*', wrapperType: 'PublicRoute' },
        { path: '/survey/edit/:uuid', wrapperType: 'PrivateRoute' },
        { path: '/survey/edit/:uuid/:sectionShortname', wrapperType: 'PrivateRoute' },
        { path: '/admin/survey/:sectionShortname', wrapperType: 'PrivateRoute' },
        { path: '/admin/survey/interview/:interviewUuid', wrapperType: 'PrivateRoute' },
        { path: '/interviews/byCode/:accessCode', wrapperType: 'PrivateRoute' },
        { path: '/interviews/byCode', wrapperType: 'PrivateRoute' },
        { path: '/interviews', wrapperType: 'PrivateRoute' },
        { path: '/admin/validation', wrapperType: 'PrivateRoute' },
        { path: '/home', wrapperType: 'PrivateRoute' },
        { path: '/unavailable', wrapperType: 'PrivateRoute' },
        { path: '/admin/monitoring', wrapperType: 'AdminRoute' },
        { path: '/admin/respondent-behavior', wrapperType: 'AdminRoute' },
        { path: '/admin/users', wrapperType: 'AdminRoute' },
        { path: '/admin', wrapperType: 'AdminRoute' }
    ];

    it('Should include all expected routes with correct total count', () => {
        const rootRoute = routes[0];
        const children = rootRoute.children || [];
        expect(children.length).toBe(expectedRoutes.length);
    });

    it.each(expectedRoutes)(
        'Should have route $path with correct path and $wrapperType wrapper',
        ({ path, wrapperType }) => {
            const rootRoute = routes[0];
            const children = rootRoute.children || [];

            const getWrapperType = (pathToCheck: string): string => {
                const route = children.find((child) => child.path === pathToCheck);
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

            const paths = children.map((child) => child.path);
            expect(paths).toContain(path);
            expect(getWrapperType(path)).toBe(wrapperType);
        }
    );
});
