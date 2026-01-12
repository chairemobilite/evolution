/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { RouteObject } from 'react-router';
import { render } from '@testing-library/react';
import getParticipantSurveyRoutes from '../ParticipantSurveyRouter';

// Mock the components since we're testing route configuration, not component rendering
jest.mock('../ParticipantRootLayout', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'ParticipantRootLayout')
}));

jest.mock('chaire-lib-frontend/lib/components/routers/PrivateRoute', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'PrivateRoute')
}));

jest.mock('chaire-lib-frontend/lib/components/routers/PublicRoute', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'PublicRoute')
}));

jest.mock('../ConsentedRoute', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'ConsentedRoute')
}));

// Mock page components
jest.mock('../../pages/HomePage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'HomePage')
}));

jest.mock('../../pages/UnauthorizedPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'UnauthorizedPage')
}));

jest.mock('../../pages/SurveyErrorPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'SurveyErrorPage')
}));

jest.mock('../../pages/auth/AuthPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'AuthPage')
}));

jest.mock('../../pages/SurveyUnavailablePage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'SurveyUnavailablePage')
}));

jest.mock('../../pages/NotFoundPage', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'NotFoundPage')
}));

jest.mock('chaire-lib-frontend/lib/components/forms/auth/passwordless/MagicLinkVerify', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'MagicLinkVerifyPage')
}));

jest.mock('chaire-lib-frontend/lib/components/forms/auth/passwordless/CheckMagicEmail', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'CheckMagicEmailPage')
}));

jest.mock('../../hoc/SurveyWithErrorBoundary', () => ({
    __esModule: true,
    default: () => React.createElement('div', null, 'Survey')
}));

// Mock the setShowUserInfoPerm action
jest.mock('chaire-lib-frontend/lib/actions/Auth', () => ({
    setShowUserInfoPerm: jest.fn()
}));

describe('getParticipantSurveyRoutes', () => {
    let routes: RouteObject[];

    beforeEach(() => {
        routes = getParticipantSurveyRoutes();
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
            '/login',
            '/magic/verify',
            '/checkMagicEmail',
            '/unauthorized',
            '/error',
            '/',
            '/home',
            '/unavailable',
            '/survey/:sectionShortname',
            '/survey',
            '/*'
        ];

        expectedRoutes.forEach((expectedPath) => {
            expect(paths).toContain(expectedPath);
        });
        expect(children.length).toBe(11);
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

    it('should use correct route wrappers (PrivateRoute, PublicRoute, ConsentedRoute) for each route', () => {
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

            if (textContent.includes('ConsentedRoute')) return 'ConsentedRoute';
            if (textContent.includes('PrivateRoute')) return 'PrivateRoute';
            if (textContent.includes('PublicRoute')) return 'PublicRoute';
            return 'Unknown';
        };

        // Verify ConsentedRoute is used for login
        expect(getWrapperType('/login')).toBe('ConsentedRoute');

        // Verify PublicRoute is used for public routes
        expect(getWrapperType('/magic/verify')).toBe('PublicRoute');
        expect(getWrapperType('/checkMagicEmail')).toBe('PublicRoute');
        expect(getWrapperType('/unauthorized')).toBe('PublicRoute');
        expect(getWrapperType('/error')).toBe('PublicRoute');
        expect(getWrapperType('/')).toBe('PublicRoute');
        expect(getWrapperType('/home')).toBe('PublicRoute');
        expect(getWrapperType('/*')).toBe('PublicRoute');

        // Verify PrivateRoute is used for protected routes
        expect(getWrapperType('/unavailable')).toBe('PrivateRoute');
        expect(getWrapperType('/survey/:sectionShortname')).toBe('PrivateRoute');
        expect(getWrapperType('/survey')).toBe('PrivateRoute');
    });
});
